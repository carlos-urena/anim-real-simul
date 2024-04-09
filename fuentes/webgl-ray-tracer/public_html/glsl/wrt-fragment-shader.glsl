#version 300 es

// -----------------------------------------------------------------------------------
//
// Carlos Ureña, Apr,2018 (adapted 2024)
//
// -----------------------------------------------------------------------------------

precision highp float ;
precision highp int ;

uniform vec2 iResolution ; // número de columnas y filas de pixels
uniform float u_param_s ;  // parámetro S 

uniform float u_ac_long_grad ; // ángulo de camara: longitud (en grados)
uniform float u_ac_lat_grad ; // ángulo de camara: latitud (en grados)

uniform bool u_solo_primarios ;

uniform float u_cam_dist ; // distancia de la cámara al look at
uniform int u_naa ; // raiz del número de muestras por pixel

uniform sampler2D u_textura_0 ;

const vec4 iMouse = vec4( 0.0, 0.0, 0.0, 0.0 ) ;
const float iTime = 0.0 ;

const float glass_ri = 1.3 ; // refractive index of glass

// root of the number of samples for antialiasing
//const int n_aa = 1 ;

// ---------------------------------------------------------------------
// Color for base plane pattern

vec4 FloorPattern( vec2 p )
{
    int ix = int(floor(p.x*2.0)),
        iy = int(floor(p.y*2.0));

    if ( (ix+iy) % 2 == 0 )
        return vec4( 0.3, 0.3, 0.6, 1.0 );
    else 
        return vec4( 0.9, 0.9, 1.0, 1.0 );
    
}

// --------------------------------------------------------------------
// RAY-TRACER
// --------------------------------------------------------------------



// --------------------------------------------------------------------

// struct datatypes

struct Camera
{
   vec3  obs;
   vec3  o,x,y, z ;
   float ratio_yx ;
} ;

// --------------------------------------------------------------------

struct Ray
{
   vec3 org, dir ;
   vec2 fragC ;
   int  obj_id ; // if the ray has origin in one object, the object's id,
                 // -1 otherwise (primary rays)
   bool in_glass ; // true if the start of the ray is in glass,
                   // false otherwise (it is false for primary rays)
} ;
 
// --------------------------------------------------------------------

struct Material
{
    float kd,    // diffuse reflection coefficient (in [0,1])
          kps ,  // perfect specular reflection coefficient (in [0,1])
          kph,   // phong component
          kt ;   // transmitted component (refracted)
} ;
    
// --------------------------------------------------------------------

struct Sphere
{
   vec3  center ;
   float radius ;
   vec3  color ;
   int   id ;  // object id
} ;

// --------------------------------------------------------------------

struct ShadingPoint
{
    vec3 pos,      // position 
         nor,      // normal vector
         view ;    // vista
    int  obj_id ;  // identifier of the object whose surface the point is in
    bool in_glass; // true if the normal points towards a glass medium
                   // false when it points towards air

} ;

// --------------------------------------------------------------------
// scene

const int id_base_plane = 0,
          id_sphere1    = 1,
          id_sphere2    = 2,
          id_sphere3    = 3,
          id_sphere4    = 4,
          id_sphere5    = 5,
          num_objects   = 6 ;
    
struct Scene
{
   vec3   sun_dir ;
   float  sun_ap_sin ;
   Camera camera ;
   Sphere sphere1,
          sphere2,
          sphere3, // outer transparent sphere (white one)
          sphere4, // inner transparent sphere (white one)
          sphere5; // diffuse green sphere
          
   Material materials[num_objects] ;
} ;
    
// scene
Scene scene ;

// --------------------------------------------------------------------
// rays stack

struct RayStackEntry
{
   Ray   ray ;       // ray to process
   bool  processed ; // true if the color has been already computed,
                     // and the child nodes have been pushed
   int   iparent ;   // parent stack entry index, -1 for root node
   vec3  color ;     // resulting color, only if 'processed == true'
   float weight ;    // weight of this color in parent ray, if any
} ;
    
const int max_n_stack = 10 ; // 20 ;  // max number of items in the stack

RayStackEntry  stack[max_n_stack] ;
    
// --------------------------------------------------------------------

struct InterStat  // ray-scene intersection status data
{
   Ray   ray ;    // ray being intersected
   float t_max,   // max. value for 't' (-1.0 if it is +infinity)
         t_hit ;  // actual smaller positive value found for 't' (-1.0 if none)
   int   id_hit ; // 'id' of current object (-1 if none)
} ;


// --------------------------------------------------------------------
const float t_threshold = 0.001 ;

bool update_is( inout InterStat is, float t, int id )
{
   if ( t < t_threshold )
     return false;
   if ( 0.0 < is.t_hit && is.t_hit < t )
     return false;
   if ( 0.0 < is.t_max && is.t_max < t )
     return false;

   is.t_hit  = t ;
   is.id_hit = id ;
   return true ;
}

// --------------------------------------------------------------------
// ray-sphere intersection
//
// 'is.ray.dir' is assumed normalized
// returns 'true' if there is an intersection, and, if there is a previous
// intersection, this is nearest than previous

bool sphere_intersect( in Sphere sphere, inout InterStat is  )
{
	vec3
      oc = is.ray.org - sphere.center;
	float
      c  = dot(oc, oc) - (sphere.radius*sphere.radius),
	   b  = dot(is.ray.dir, oc) ,
      di = b*b - c ;   // discriminant

   if ( di < 0.0 ) // no sphere-ray intersection, 'is' is not written
      return false ;

   float
      sqrt_di = sqrt(di),
      t ;

   t = -b - sqrt_di ;
	if ( t < t_threshold )
      t = -b + sqrt_di ;

   return update_is( is, t, sphere.id );
}

// --------------------------------------------------------------------
// ray-plane intersection (infinite plane at y==0)
// returns 'true' if there is an intersection and it is nearest than a 
// the previous one stored in 'is', if any.

bool horizon_plane_intersection( in int plane_id, inout InterStat is )
{
    if ( abs(is.ray.dir.y) < 1e-5 )
      return false ;

   float
      t = -is.ray.org.y / is.ray.dir.y ;

   return update_is( is, t, plane_id );
}

// --------------------------------------------------------------------
// it just test if the ray is blocked by any object in the scene

bool ray_blocked( in Ray ray )
{
   InterStat is ;

   is.t_max  = -1.0 ;
   is.t_hit  = -1.0 ;
   is.id_hit = -1 ;
   is.ray    = ray ;

   if ( ray.obj_id != id_base_plane )
   {
      horizon_plane_intersection( id_base_plane, is );
      if ( is.id_hit != -1 )
        return true ;
   }

   if ( ray.obj_id != id_sphere1 )
   {
      sphere_intersect( scene.sphere1, is );
      if ( is.id_hit != -1 )
         return true ;
   }

   if ( ray.obj_id != id_sphere2 )
   {
   	sphere_intersect( scene.sphere2, is );
      if ( is.id_hit != -1 )
        return true ;
   }
    
   if ( ray.obj_id != id_sphere3 )
   {
   	sphere_intersect( scene.sphere3, is );
      if ( is.id_hit != -1 )
        return true ;
   }
    
   if ( ray.obj_id != id_sphere4 )
   {
   	sphere_intersect( scene.sphere4, is );
      if ( is.id_hit != -1 )
        return true ;
   }

   if ( ray.obj_id != id_sphere5 )
   {
   	sphere_intersect( scene.sphere5, is );
      if ( is.id_hit != -1 )
        return true ;
   }
    
   return false ;
}

// --------------------------------------------------------------------
// returns true if the shading point is visible from 'scene.sun_dir', false otherwise

bool sun_dir_visible( in ShadingPoint sp )
{
   Ray ray ;
    
   if ( dot( sp.nor, scene.sun_dir ) < 0.0 )
      return false ;

   ray.org    = sp.pos ;
   ray.dir    = scene.sun_dir ;
   ray.obj_id = sp.obj_id ;

   return ! ray_blocked( ray );
}
// --------------------------------------------------------------------

vec3 phong_component( in vec3 nor, in vec3 view, in vec3 light )
{
    float vh = dot( nor, normalize( view+light ) ),
          b  = pow( vh, 32.0 );
    
    return vec3( b, b, b );
}

// --------------------------------------------------------------------

vec3 sphere_shader( in Sphere sphere, in ShadingPoint sp )
{
    if ( u_solo_primarios )
    {
      float b = max( 0.2, sp.nor.y );
      return b*sphere.color ;
    }

    vec3 res = vec3( 0.0, 0.0, 0.0 ) ;
    
    if ( sun_dir_visible( sp ) )
    {
      float ldn = max( 0.0, dot( sp.nor, scene.sun_dir )),
            kd  = scene.materials[sp.obj_id].kd ,
            kph = scene.materials[sp.obj_id].kph ;
        
      res += ldn*kd*sphere.color ;
        
      if ( 0.0 < kph )
         res += kph*phong_component( sp.nor, sp.view, scene.sun_dir ); 
    }

    return res ;
}

// --------------------------------------------------------------------

vec3 sphere_color( in Sphere sphere, in InterStat is,  out ShadingPoint sp )
{
    sp.pos    = is.ray.org + is.t_hit*is.ray.dir ;
    sp.view   = -is.ray.dir ;
    
    sp.nor    = normalize( sp.pos - sphere.center );
    sp.obj_id = sphere.id ;
    sp.in_glass = is.ray.in_glass ;

    return sphere_shader( sphere, sp );
}

// --------------------------------------------------------------------

vec3 horizon_plane_shader( in ShadingPoint sp )
{
   if ( u_solo_primarios )
      return FloorPattern( sp.pos.xz ).rgb;

    float vis = sun_dir_visible( sp ) ?  1.0 : 0.5 ,
          kd  = scene.materials[sp.obj_id].kd,
          kph = scene.materials[sp.obj_id].kph ;

    vec4 col = FloorPattern( sp.pos.xz );
    vec3 nor = vec3( 0.0, 1.0, 0.0 );
    vec3 res_color = vis*kd*col.rgb ;
    
    if ( vis == 1.0 && 0.0 < kph)
       res_color += kph*phong_component(nor,sp.view,scene.sun_dir) ; 
    
    return res_color ;
}

// --------------------------------------------------------------------

vec3 horizon_plane_color( in InterStat is, out ShadingPoint sp )
{
   sp.pos    = is.ray.org + is.t_hit*is.ray.dir ;
   sp.view   = -is.ray.dir ;
   sp.obj_id = is.id_hit ;
   sp.nor    = vec3( 0.0, 1.0, 0.0 );
   sp.in_glass = false ;

   return horizon_plane_shader( sp );
}

// --------------------------------------------------------------------
// compute primary ray origin and direction, from the fragment coord and
// camera parameters

Camera compute_camera( in vec3 cam_look_at, in float dist )
{

    Camera cam ;
    vec3 cam_vup = vec3( 0.0, 1.0, 0.0 );
    //float dist = 2.0 ;
    vec2 dxy = iMouse.xy - abs(iMouse.zw) ; // sign of .zw tells if a click happened or not...

    float ahr = -10.0*u_ac_long_grad*3.14159265/180.0 ;
    float avr = -10.0*u_ac_lat_grad*3.14159265/180.0 ;

    float fx   = 0.011,
          fy   = 0.01 ,
          lat0 = 0.5,
          lon0 = 0.5,
          lon  = lon0 + fx*(dxy.x + ahr),
          lat  = max( 0.0, min( 1.5, lat0 - fy*(dxy.y+avr) )),
          cos_lat = cos(lat);

    cam.z = vec3( cos(lon)*cos_lat , sin(lat), sin(lon)*cos_lat );

    cam.obs = cam_look_at + dist*cam.z ;
    cam.o   = cam.obs - 1.5*cam.z ;
    cam.x   = normalize( cross( cam_vup, cam.z ) );
    cam.y   = normalize( cross( cam.x, cam.z ) ); // do we really need to normalize here ?

    cam.ratio_yx = iResolution.y/iResolution.x ;

    return cam ;
}


// --------------------------------------------------------------------
// compute primary ray origin and direction, from the fragment coord and
// camera parameters

Ray primary_ray( in vec2 sample_coords, in Camera cam )
{
    Ray pray ;
    vec2  uv  = sample_coords/iResolution.xy;     // uv in [0,1]^2
    float x   = 2.0*uv[0] - 1.0 ,                 // x in [-1,+1]
          y   = (1.0 - 2.0*uv[1] )*cam.ratio_yx ; // y in [-ratio_yx,+ratio_yx]
    vec3  p   = cam.o + x*cam.x + y*cam.y ; // p is the point in the view-plane

    pray.dir    = normalize( p - cam.obs ),
    pray.org    = cam.obs ;
    pray.fragC  = sample_coords ;
    pray.obj_id = -1 ;
    pray.in_glass = false ; // we assume observer is not 'in glass'

    return pray ;
}

// --------------------------------------------------------------------
// return background color for ray (which doest not intersect nothing 

vec3 background_color( in Ray ray )
{
   if ( u_solo_primarios )
      return vec3( 0.0, 0.2, 0.8 );

    float b = max( 0.0, dot( ray.dir, scene.sun_dir ) );
    if ( 1.0-scene.sun_ap_sin < b )
        return vec3( 1.0,1.0,1.0 );
        
    vec3 d = vec3( ray.dir.x, ray.dir.y/2.0, ray.dir.z ),
         da = abs( d );

    vec2 cct ;
    const float fv = 1.5 ;

    vec2 par ;
    if ( d.y > 0.2  ) // max is 1.5*Y (use x,z)
    {
        cct = vec2( 0.5, 0.01 ) ;
    }
    else 
    {
        const float pi = 3.1415927 ;

        const float nreps_ang = 8.0 ;
        float ang01 = ((atan( d.x, d.z ) + 0.5*pi) / pi );
        float angn  = nreps_ang*ang01 ;
        float angf  = fract( angn );
        int   angi  = int(angn);

        if ( angi % 2 == 1 )
            angf = 1.0-angf ;
            
        
        cct = vec2( angf, max( 0.5, 5.0*(1.0-d.y)) );
    }

    vec4 col = texture( u_textura_0, fract( cct ));
    return 1.0*pow( col.rgb, 2.0*vec3(1.0, 1.0, 1.0) ) ;
    //return col.rgb ;
    
}
// --------------------------------------------------------------------

InterStat scene_intersect( in Ray ray )
{
   InterStat is ;

   is.t_max  = -1.0 ;
   is.t_hit  = -1.0 ;
   is.id_hit = -1 ;
   is.ray    = ray ;

   if ( ray.obj_id != id_sphere1 )
         sphere_intersect( scene.sphere1, is );

   if ( ray.obj_id != id_sphere2 )
         sphere_intersect( scene.sphere2, is );
   
   sphere_intersect( scene.sphere3, is );
   
   sphere_intersect( scene.sphere4, is );

   if ( ray.obj_id != id_sphere5 )
         sphere_intersect( scene.sphere5, is );
   
   if ( ray.obj_id != id_base_plane )
      horizon_plane_intersection( id_base_plane, is ); 
   
   return is ;
}

// --------------------------------------------------------------------

vec3 scene_color( in InterStat is, out ShadingPoint sp )
{
   if ( is.id_hit == id_base_plane )
      return horizon_plane_color( is, sp );
   
   if ( is.id_hit == id_sphere1 )
   return sphere_color( scene.sphere1, is, sp  );
   
   if ( is.id_hit == id_sphere2 )
      return sphere_color( scene.sphere2, is, sp  );
   
   if ( is.id_hit == id_sphere3 )
      return sphere_color( scene.sphere3, is, sp  );
   
   if ( is.id_hit == id_sphere4 )
      return sphere_color( scene.sphere4, is, sp  );

   if ( is.id_hit == id_sphere5 )
      return sphere_color( scene.sphere5, is, sp  );
   
   return background_color( is.ray ) ;
}
// --------------------------------------------------------------------
// computes the reflected ray, the classical formula for the direction 
// is here:
// https://en.wikipedia.org/wiki/Specular_reflection#Vector_formulation

Ray reflected_ray( in ShadingPoint sp )
{
   Ray rr ; 
    
   rr.org      = sp.pos ;
   rr.dir      = 2.0*dot(sp.view,sp.nor)*sp.nor - sp.view ;
   rr.obj_id   = sp.obj_id ;
   rr.in_glass = sp.in_glass ;
    
   return rr ;
}
// --------------------------------------------------------------------
// computed the refracted ray
// the formula for the refracted ray direction can be seen here:
// https://en.wikipedia.org/wiki/Snell%27s_law#Vector_form

Ray get_refracted_ray( in ShadingPoint sp )
{
   const float glass_ri_inv = 1.0/glass_ri ;
    
   vec3 l = -sp.view , // wikipedia formulation uses l "from light to shading point"
        no = sp.nor ;
    
   // r == ratio of refraction indexes
   float r = sp.in_glass ? glass_ri : glass_ri_inv ;
    
    // c == cosine of incidence angle
   float c = -dot( no, l );
   
   // if we hit the point in the 'back' side (w.r.t the normal), flip normal.
   if ( c < 0.0 ) 
   {  
      c = -c ;
      no = -no ;
   }
   
   Ray rr ; // resulting ray 
   float radicand = 1.0-r*r*(1.0-c*c);
    
   if ( radicand < 0.0 ) 
   {
      // total internal reflection 
      rr.org      = sp.pos ;
      rr.dir      = 2.0*c*no + l ; // reflected ray formula, with l = -sp.view
      rr.obj_id   = sp.obj_id ;
      rr.in_glass = sp.in_glass ; // no medium switch 
   }
   else
   {
      // normal refraction: build rr 
      rr.org      = sp.pos ;
      rr.dir      = r*l + (r*c-sqrt(radicand))*no ;
      rr.obj_id   = sp.obj_id ;
      rr.in_glass = ! sp.in_glass ; // medium switch
   } 
   return rr ;
}

// --------------------------------------------------------------------
// returns the color (radiance) incident on ray origin, coming 
// from ray direction

vec3 ray_color( in Ray ray )
{
   int  n = 0;     // number of entries already in the stack 
   vec3 res_color; // resulting color
   int max_n_efectivo ;

   if ( u_solo_primarios )
      max_n_efectivo = 1 ;
   else 
      max_n_efectivo = max_n_stack ;

   // push the first ray
   stack[n].ray       = ray ;
   stack[n].processed = false ;
   stack[n].iparent   = -1 ;      // -1 means this is first node in stack (has no parent)
   stack[n].color     = vec3( 0.0, 0.0, 0.0 );
   stack[n].weight    = 1.0 ;
   n++ ;
    
   // loop while the stack is not empty
    
   while( n > 0 )
   {
     int itop = n-1 ;

     // if node on top is already processed, pop it
     if ( stack[itop].processed ) 
     {
         vec3 col     = stack[itop].weight*stack[itop].color ;
         int  iparent = stack[itop].iparent ;
          
         if ( iparent == -1 ) 
             res_color = col ; 
         else  
         	stack[iparent].color += col ;
         	
         n-- ;  // pop this node
         continue ;
     }
     
     // Process an unprocessed node:
     
     // (1) intersect ray and get 'is' object
       
     ShadingPoint sp ;
     InterStat    is     = scene_intersect( stack[itop].ray ); 
     bool         inters = is.id_hit != -1 ;
     
       
     // (2) compute and update node color (initializes 'sp')
     stack[itop].color = scene_color( is, sp );    
      
     // (3) push child rays if neccesary   
     if ( inters && (n < max_n_efectivo) )
     {  
         float kps = scene.materials[is.id_hit].kps ;
         float kt  = scene.materials[is.id_hit].kt ;
         float vn  = abs(dot(sp.nor,sp.view));
         bool  reflection = (0.0<kps && 0.0 < vn );// && ! sp.in_glass) ; // do reflection ?
         int   sig_n  = reflection ? n+1 : n ;
         bool  refraction = (sig_n < max_n_efectivo) && 0.0 < kt ; // do refraction ?
         float spec_c = kps ; // specular reflection coefficient 
         float refr_c = kt ; // refraction coefficient

         // Use Schlick's approximation to mix reflection and refraction
         // (see: https://en.wikipedia.org/wiki/Schlick%27s_approximation)
         
         if ( reflection && refraction )
         {
            float n0 = glass_ri ;
            float n1 = 1.0 ;
            float a  = (n0-n1)/(n0+n1);
            float r0 = a*a ;
            float b  = 1.0-vn ;
            float c5 = b*b*b*b*b ;
            spec_c   = r0 + (1.0-r0)*c5 ;
            refr_c   = 1.0 - spec_c ;
         }
         
      
         // if there is reflection, push reflected ray:

         if ( reflection )
         {
            // computed reflected ray
            Ray refl_ray = reflected_ray( sp ); 
               
            // push reflected ray entry      
            stack[n].ray       = refl_ray ;
            stack[n].processed = false ;
            stack[n].iparent   = itop ; 
            stack[n].color     = vec3( 0.0, 0.0, 0.0 );
            stack[n].weight    = spec_c ;// kps ;
            n++ ;
         }
            
         // if there is refraction, push refracted ray:

         if ( refraction )
         {
            // compute refracted ray
            Ray refrac_ray = get_refracted_ray( sp );
               
            // push refracted ray entry      
            stack[n].ray       = refrac_ray ;
            stack[n].processed = false ;
            stack[n].iparent   = itop ; 
            stack[n].color     = vec3( 0.0, 0.0, 0.0 );
            stack[n].weight    = refr_c ; // kt ;
            
            n++ ;  
         }
     }
     // (4) mark the node as processed
     stack[itop].processed = true ;
       
   } // end while 

   return res_color; 
}

// --------------------------------------------------------------------
// computed anti-aliased pixel color
//
// fcoords.x  goes from 0.5 to iResolution.x-0.5 (same for .y)

vec4 AA_pixel_color( in vec2 pixel_coords )
{
    vec3 sum = vec3( 0.0, 0.0, 0.0 );
    //const float n_aa_f = float(n_aa);
    int   n_aa  = u_naa ;
    float n_aa_f = float(n_aa);

    for( int i = 0 ; i < n_aa ; i++ )
    {
       float desplx = (float(i)+0.5)/n_aa_f -0.5 ;

       for( int j = 0 ; j < n_aa ; j++ )
       {
          float desply = (float(j)+0.5)/n_aa_f -0.5;
          float fac = 1.0000 ;
          vec2  despl         = fac*vec2( desplx, desply  ), // why we must multiply by something other than 1 ?
                sample_coords = pixel_coords + despl ;
          Ray   ray           = primary_ray( sample_coords, scene.camera ) ;
          vec3  col           = ray_color( ray );

          sum = sum + col ;
       }
    }

    return vec4( sum/(n_aa_f*n_aa_f) ,1.0 );
}

// --------------------------------------------------------------------
// --------------------------------------------------------------------

in vec2 posicion ;
layout (location = 0) out vec4 frag_color ;

void main(  )
{
   

    // scene parameters
    
    vec3 cam_look_at = vec3( -0.4, 0.4, 0.5 ) 
                          + cos( iTime )*vec3(1.0,0.0,0.0)
                          + sin( iTime )*vec3(0.0,0.1,0.3) ;
    

    scene.camera  = compute_camera( cam_look_at, u_cam_dist );
    scene.sun_dir = normalize( vec3( 0.2, 1.2, 1.0 ) );
    scene.sun_ap_sin = 0.003 ;
    
    // base plane 
    
    scene.materials[id_base_plane].kd  = 0.5;
    scene.materials[id_base_plane].kps = 0.2;
    scene.materials[id_base_plane].kph = 0.5;
    scene.materials[id_base_plane].kt  = 0.0;
    
    // sphere 1 

    scene.sphere1.id      = id_sphere1 ;
    scene.sphere1.center  = vec3( 0.0, 0.5, 0.0 );
    scene.sphere1.radius  = 0.5 ;
    scene.sphere1.color   = vec3(0.5,0.5,1.0);
    
    scene.materials[id_sphere1].kd  = 0.6;
    scene.materials[id_sphere1].kph = 0.6;
    scene.materials[id_sphere1].kps = 0.5;
    scene.materials[id_sphere1].kt  = 0.0;
    
    
    // sphere 2 

    scene.sphere2.id      = id_sphere2 ;
    scene.sphere2.center  = vec3( 0.0, 0.4, 0.9 );
    scene.sphere2.radius  = 0.4 ;
    scene.sphere2.color   = vec3( 1.0, 0.2, 0.2 );

    scene.materials[id_sphere2].kd  = 0.3;
    scene.materials[id_sphere2].kph = 0.3;
    scene.materials[id_sphere2].kps = 0.4;
    scene.materials[id_sphere2].kt  = 0.0;
    
    // sphere 3 (outer sphere in the transparent ball)
    
    float tr_sph_rad    = 0.35 ;
    vec3  tr_sph_center = vec3( 1.0, tr_sph_rad, 0.6 ) ;

    scene.sphere3.id      = id_sphere3 ;
    scene.sphere3.center  = tr_sph_center;
    scene.sphere3.radius  = tr_sph_rad ;
    scene.sphere3.color   = vec3( 1.0, 1.0, 1.0 );

    scene.materials[id_sphere3].kd  = 0.0;
    scene.materials[id_sphere3].kph = 0.0;
    scene.materials[id_sphere3].kps = 0.3;
    scene.materials[id_sphere3].kt  = 0.8;
    
    // sphere 4 (inner sphere in the transparent ball)

    scene.sphere4.id      = id_sphere4 ;
    scene.sphere4.center  = tr_sph_center;
    scene.sphere4.radius  = 0.9*tr_sph_rad ;
    scene.sphere4.color   = vec3( 1.0, 1.0, 1.0 );

    scene.materials[id_sphere4].kd  = 0.0;
    scene.materials[id_sphere4].kph = 0.0;
    scene.materials[id_sphere4].kps = 0.0;
    scene.materials[id_sphere4].kt  = 1.0;
    
    
    // sphere 5 

    scene.sphere5.id      = id_sphere5 ;
    scene.sphere5.center  = vec3( 0.9, 0.25, 0.0 );
    scene.sphere5.radius  = 0.25 ;
    scene.sphere5.color   = vec3( 0.6, 0.8, 0.0 );

    scene.materials[id_sphere5].kd  = 0.5;
    scene.materials[id_sphere5].kph = 0.7;
    scene.materials[id_sphere5].kps = 0.0;
    scene.materials[id_sphere5].kt  = 0.0;
    
    /**
    // sphere 6 

    scene.sphere6.id      = id_sphere6 ;
    scene.sphere6.center  = vec3( 0.9, 0.25, 0.0 );
    scene.sphere6.radius  = 0.22 ;
    scene.sphere6.color   = vec3( 1.0, 1.0, 1.0 );

    scene.materials[id_sphere6].kd  = 0.0;
    scene.materials[id_sphere6].kph = 0.0;
    scene.materials[id_sphere6].kps = 0.0;
    scene.materials[id_sphere6].kt  = 1.0;
    **/
    
    // ----
    
    vec2 fc01 = 0.5* (vec2(1.0,1.0) + posicion );
    vec2 pixel_coords = trunc( iResolution*fc01 );

    frag_color = AA_pixel_color( pixel_coords ) ;
    //frag_color = vec4( fc01.x, fc01.y, 0.0, 1.0 );
               
}
