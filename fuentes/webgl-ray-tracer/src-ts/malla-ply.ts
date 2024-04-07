
import { Log, Assert, LeerArchivoTexto } from "./utilidades.js"

import { MallaInd } from "./malla-ind.js"
import { Vec3, UVec3 } from "./vec-mat.js"

export class MallaPLY extends MallaInd 
{
   
   private url  : string = ""
   
   /**
    *  Crea una instancia de MallaPLY, pero no está inicializada todavía
    *  (lo estará después de llamar a 'leer')
    */
   constructor( url : string  ) 
   {
      const nombref : string = 'MallaPLY.constructor:'
      super() 

      Assert( url != "" , `${nombref} la url está vacía`)
      this.url = url  
      
      // obtener el nombre del archivo a partir del nombre completo con carpetas
      const nombre_archivo : string = (((url.split('\\').pop())!.split('/'))!.pop())!

      this.fijarNombre = `${nombre_archivo}`
   }
   // -------------------------------------------------------------------------------
   
   /**
    * Descarga el archivo a partir de la URL en 'this.url', lo analiza y crea 
    * las tablas de vértices y triángulos (this.posiciones y this.triangulos)
    * Calcula las normales de vértices y triángulos (this.nor..)
    */
   public async leer() : Promise<void> 
   {
      const nombref : string = 'MallaPLY.leer:'
      const info : string = `${nombref} leyendo ply '${this.url}' : `

      Assert( this.posiciones.length == 0, `${info} la tabla de posiciones de vértices no estaba vacía`)
      Assert( this.triangulos.length == 0, `${info} la tabla de triángulos no estaba vacía`)

      const texto_ply_bruto : string = await LeerArchivoTexto( this.url )
      const lineas          : Array<string> = texto_ply_bruto.split(/\r?\n/)
      
      let nl     : number = 0  // número de línea que se va a procesar  
      
      let nv     : number = 0 // número de vértices según la cabecera 
      let nt     : number = 0 // numero de caras (triángulos) según la cabecera 
      
      //let verts : Vec3[] = []   // vertices leídos hasta ahora 
      //let tris  : UVec3[] = []  // triángulos leídos hasta ahora

      let tokens : Array<string> = []  // tokens de la linea actual
      let linea  : string // linea actual
      let estado : number = 0 // estado: 0 --> en cabecera, 1 leyendo vértices, 2 leyendo caras

      // Parser de PLYs: lee línea a línea y puede estar en alguno de estos 3 estados:
      //
      //   0 -> en la cabecera (antes de leer vértices) (estado inicial).
      //   1 -> leyendo la tabla de vértices
      //   2 -> leyendo la tabla de caras

      // leer y procesar todas las líneas en un bucle
      while( nl < lineas.length )
      {
         const info_linea = `${info} línea ${nl+1}: `

         // hacer cambio de estado 1 a 2 si procede
         if ( estado == 1 && this.posiciones.length == nv )
            estado = 2 

         // obtener siguiente línea (se busca hasta línea no vacía o el final del archivo)
         linea = lineas[nl]
         tokens = lineas[nl].trim().split(/\s+/) // separar la línea en tokens
         while( tokens.length == 0 && nl < lineas.length-1 )
         {
            nl = nl+1
            linea = lineas[nl]
            tokens = linea.trim().split(/\s+/) // separar la línea en tokens
         }
         // salir si se ha llegado al final de las lineas sin encontrar ninguna no vacía 
         if ( nl == lineas.length-1 )
            break 

         // procesar línea
         if ( estado == 0 && tokens[0] != "comment" )  // si estamos en la cabecera
         {
            if ( tokens[0] == 'element' && tokens[1] == 'vertex' )
            {
               nv = parseInt( tokens[2] )
               Assert( nv > 0, `${info_linea} el número de vértices indicado en la cabecera es 0 o no es un entero` )
            }
            else if ( tokens[0] == 'element' && tokens[1] == 'face' )
            {
               nt = parseInt( tokens[2] )
               Assert( nt > 0, `${info_linea} el número de caras indicado en la cabecera es 0 o no es un entero` )
            }
            else if ( tokens[0] == 'end_header' ) // pasar al estado 1 al acabar la cabecera
            {
               Assert( nv > 0, `${info_linea} no se encuentra el número de vértices en la cabecera` )
               Assert( nt > 0, `${info_linea} no se encuentra el número de caras en la cabecera` )
               estado = 1
            }
         }
         else if ( estado == 1 && tokens[0] != "comment" ) // leyendo vértices
         {
            Assert( 3 <= tokens.length, `${info_linea} línea de vértice con menos de tres valores` )
            this.posiciones.push( new Vec3([ parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]) ]))
         }
         else if ( estado == 2 && tokens[0] != "comment") // estado == 2 (leyendo caras)
         {
            Assert( tokens.length == 4, `${info_linea} se esperaban 4 números, leyendo caras \n(línea == [${linea}])`)
            Assert( parseInt( tokens[0] ) == 3, `${info_linea} encontrada cara con un número de vértices distinto de 3 o que no es un entero.`)
            this.triangulos.push( new UVec3([ parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3]) ]))
         }
         else if ( tokens[0] == "comment" )
            Log(`${info} ${linea}`)

         nl = nl+1

      }
      
      // ver si ha ido todo bien
      if ( nl == 0 ) throw Error(`${info} el archivo está vacío (no tiene líneas )`)
      if ( this.posiciones.length != nv ) throw Error(`${info} encontrados ${this.posiciones.length} vértices, pero en la cabecera se dice que debe de haber ${nv}`)
      if ( this.triangulos.length != nt ) throw Error(`${info} encontrados ${this.posiciones.length} triángulos, pero en la cabecera se dice que debe de haber ${nt})`)

      Log(`${info} encontrados ${nv} vértices y ${nt} triángulos.`)

      // calcular las normales
      this.calcularNormales()
   }
   // ----------------------------------------------------------------------------------------
   /**
    * descarga del servidor el archivo PLY, lo analiza y crea una malla indexada tipo 'ply'
    * 
    * @param url (string) URL del archivo PLY en el servidor 
    * @returns (MallaPLY) malla indexada leída
    */
   public static async crear( url : string ) : Promise<MallaPLY>
   {
      const nombref : string = 'LeerMallaPLY:'
      let malla_ply = new MallaPLY( url )
      await malla_ply.leer() 
      return malla_ply
   }
}

