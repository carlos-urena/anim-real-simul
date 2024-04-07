#version 300 es

// vertex shader absolutamnte mínimo 
// (para dibujar un rectángulo)


precision highp float ;
precision highp int ;

in vec3  in_posicion ;   // posición del vértice en coordenadas de objeto
out vec2 posicion ;      // posición interpolada para el FS

void main()
{
   posicion = in_posicion.xy ;
   gl_Position = vec4( in_posicion, 1.0 ) ; 
}
