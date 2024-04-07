// vertex shader absolutamnte mínimo 
// (para dibujar un rectángulo)

#version 300 es

precision highp float ;
precision highp int ;

in vec3 in_posicion_occ ;   // posición del vértice en coordenadas de objeto

void main()
{
   gl_Position = in_posicion_occ ; 
}
