#version 300 es

// -----------------------------------------------------------------------------------
//
// Carlos Ureña, Apr,2018 (adapted 2024)
//
// -----------------------------------------------------------------------------------

precision highp float ;
precision highp int ;

uniform vec2 iResolution ; // número de columnas y filas de pixels
uniform float u_param_s ;
const float iTime = 0.0 ;

in vec2 posicion ;

layout (location = 0) out vec4 frag_color ;

void main(  )
{
    vec2 fc01 = 0.5* (vec2(1.0,1.0) + posicion );
    frag_color = vec4( fc01.xy, u_param_s, 1.0 ) ; 
               
}
