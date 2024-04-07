import { Mat4, CMat4 } from "./vec-mat.js"
import { ObjetoVisualizable } from "./objeto-visu.js"
import { Textura } from "./texturas.js"
import { Material } from "./material.js"
import { AplicacionWRT } from "./aplicacion-wrt.js"


/**
 * Tipo unión para los objetos en las entradas de un nodo del grafo de Escena
 */
type TipoObjetoNGE = ObjetoVisualizable | Mat4 | Textura | Material


class NodoGrafoEscena extends ObjetoVisualizable
{
   private entradas : TipoObjetoNGE[] = []

   public agregar( objeto : TipoObjetoNGE ) : number 
   {
      this.entradas.push( objeto )
      return this.entradas.length-1
   }
   
   /**
    * Visualiza este nodo del grafo de escena, 
    * (si la aplicación tiene activada la iluminación, tiene en cuento normales )
    */
   public visualizar() : void 
   {
      const nombref : string = `NodoGrafoEscena.visualizar (${this.leerNombre}):`
      let apl   = AplicacionWRT.instancia
      let cauce = apl.cauce
       
      // guardar estado: color, material, textura, matriz de modelado
      if ( this.tieneColor )
      {
         cauce.pushColor()
         cauce.fijarColor( this.leerColor )
      }
      Material.push()
      Textura.push()
      cauce.pushMM()

      // recorrer las entradas y procesar cada una de ellas en función del 
      // tipo de objeto que hay en la misma

      for( let objeto of this.entradas )
      {
         if ( objeto instanceof ObjetoVisualizable )
            objeto.visualizar()

         else if ( objeto instanceof Mat4 )
            cauce.compMM( objeto )

         else if ( objeto instanceof Textura )
           objeto.activar()

         else if ( objeto instanceof Material )
         {
            if ( apl.iluminacion_activada )
               objeto.activar()
         }
      }
      
      // recuperar estado anterior: color, material, textura, matriz de modelado
      cauce.popMM()
      Textura.pop()
      Material.pop()
      if ( this.tieneColor )
         cauce.popColor()

   }
   
   public visualizarAristas() : void 
   {
      const nombref : string = `NodoGrafoEscena.visualizarAristas  (${this.leerNombre}):`
      let cauce = AplicacionWRT.instancia.cauce 

      cauce.pushMM()
      for( let objeto of this.entradas )
      {
         if ( objeto instanceof ObjetoVisualizable )
            objeto.visualizarAristas()
         else if ( objeto instanceof Mat4 )
            cauce.compMM( objeto )
        
      }
      cauce.popMM()
   }

   public visualizarNormales() : void 
   {
      const nombref : string = `NodoGrafoEscena.visualizarNormales  (${this.leerNombre}):`
      let cauce = AplicacionWRT.instancia.cauce 

      cauce.pushMM()
      for( let objeto of this.entradas )
      {
         if ( objeto instanceof ObjetoVisualizable )
            objeto.visualizarNormales()
         else if ( objeto instanceof Mat4 )
            cauce.compMM( objeto )
        
      }
      cauce.popMM()
   }
}
// -------------------------------------------------------------------------------------------


import { Vec3 } from "./vec-mat.js"
import { TrianguloTest, TrianguloIndexadoTest, RejillaXY } from "./utilidades.js"
import { CuadroXYColores } from "./vaos-vbos.js"
import { CuadradoXYTextura } from "./malla-ind.js"


/**
 * Clase de pruebas para grafos de escena (contiene varios objetos de prueba)
 */
export class GrafoTest extends NodoGrafoEscena
{
   constructor( textura : Textura )
   {
      super()
      this.fijarNombre = 'GrafoTest'

      let n = new NodoGrafoEscena()
      n.agregar( CMat4.rotacionYgrad( 90.0 ))
      n.agregar( CMat4.traslacion( new Vec3([ 0.0, 0.0, 0.3 ])))
      n.agregar( new CuadradoXYTextura(textura) )

      this.agregar( n )
      this.agregar( new CuadroXYColores() )
      this.agregar( CMat4.traslacion( new Vec3([ 0.0, 0.0, 0.2 ])))
      this.agregar( new TrianguloTest() )
      this.agregar( CMat4.traslacion( new Vec3([ 0.0, 0.0, 0.2 ])))
      this.agregar( new TrianguloIndexadoTest() )
      this.agregar( CMat4.traslacion( new Vec3([ 0.0, 0.0, 0.2 ])))
      this.agregar( new RejillaXY() )
      this.agregar( CMat4.traslacion( new Vec3([ 0.0, 0.0, 0.5 ])))
      this.agregar( new RejillaXY() )
   }
}

import { MallaEsfera, MallaCono, MallaCilindro } from "./malla-sup-par.js"
/**
 * Clase de pruebas para grafos de escena (contiene varios objetos de prueba con distintos materiales 
 * y distintas texturas)
 */
export class GrafoTest2 extends NodoGrafoEscena
{
   constructor( tex1 : Textura, tex2 : Textura, tex3 : Textura )
   {
      super()
      this.fijarNombre = 'GrafoTest2'

      this.agregar( CMat4.escalado( new Vec3([ 0.4, 0.4, 0.4 ])))
      this.agregar( tex1 )
      this.agregar( new MallaEsfera(32,32) )
      this.agregar( CMat4.traslacion( new Vec3([ 2.0, 0.0, 0.0 ])))

      this.agregar( tex2 )
      this.agregar( new MallaCono(32,32) )
      this.agregar( CMat4.traslacion( new Vec3([ 2.0, 0.0, 0.0 ])))

      this.agregar( tex3 )
      this.agregar( new MallaCilindro(32,32) )
      this.agregar( CMat4.traslacion( new Vec3([ 2.0, 0.0, 0.0 ])))

      
   }
}

