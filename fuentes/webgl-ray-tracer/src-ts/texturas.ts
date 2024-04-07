
import { Log, Assert, esPotenciaDe2, ComprErrorGL,
         LeerArchivoImagen } from "./utilidades.js" 
import { Cauce } from "./cauce.js"
import { AplicacionWRT } from "./aplicacion-wrt.js"



// -------------------------------------------------------------------------------------

/**
 * Clase que encapsula una imagen usada como textura y el 
 * correspondiente objeto textura de WebGL
 */
export class Textura 
{
   private url          : string = ""
   private elemento_img : HTMLImageElement | null = null 
   private texture      : WebGLTexture | null = null  

   // --------------------------------------------------------------
   // variables de instancia estáticas ('static'), no específicas de una instancia

   // Textura actualmente activada en el cauce (se usa para push/pop)
   // (si es null es que no hay textura activada)
   private static actual : Textura | null = null 

   // pila de texturas, inicialmente vacía
   private static pila : Array<Textura|null> = []

   // -----------------------------------------------------------------

   constructor( url : string  ) 
   {
      const nombref : string = 'Textura.constructor:'
      Assert( url != "" , `${nombref} la url está vacía`)
      this.url = url  
   }

   async leer() : Promise<void>  
   {
      const nombref : string = 'Textura.leer:'
      Assert( this.elemento_img == null , `${nombref} no se puede leer una textura ya leída (this.url)`)
      this.elemento_img = await LeerArchivoImagen( this.url ) 

      Log(`${nombref} textura '${this.url}' cargada, dimensiones == ${this.elemento_img.width} x ${this.elemento_img.height}`)
   }

   crearTexturaWebGL( ) : void
   {
      const nombref : string = 'Textura.crearTexturaWebGL'
      if ( this.elemento_img == null ) 
         throw Error(`${nombref} no se puede crear el objeto textura WebGL si la imagen no está cargada`)
      Assert( this.texture == null, `${nombref} no se puede crear la textura dos veces`)

      let img : HTMLImageElement = this.elemento_img
      let gl = AplicacionWRT.instancia.gl

      ComprErrorGL( gl, `${nombref} al inicio`)

      const
        level       : number = 0,
        internalFmt : number = gl.RGB,   
        srcFmt      : number = gl.RGB,   //// ---> como saberlo ??
        srcType     : number = gl.UNSIGNED_BYTE

      // create, bind and fill the texture
      this.texture = gl.createTexture()
      gl.bindTexture( gl.TEXTURE_2D, this.texture )
      gl.texImage2D( gl.TEXTURE_2D, level, internalFmt, srcFmt, srcType, img )

      // Generate MIPMAPS ....
      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if ( esPotenciaDe2( img.width ) && esPotenciaDe2( img.height ))
      {
         // Yes, it's a power of 2. Generate mips.
         gl.generateMipmap( gl.TEXTURE_2D )
         Log(`${nombref} generado mip-map.`)
      }
      else
      {
         // No, it's not a power of 2. Turn off mips and set
         // wrapping to clamp to edge
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
         Log(`${nombref} mip-map no generado.`)
      }

      gl.bindTexture( gl.TEXTURE_2D, null )
      ComprErrorGL( gl, `${nombref} al final`)


   }
   // -----------------------------------------------------------------------------------------

   activar(  ) : void
   {
      const nombref : string = 'Textura.activar:'
      let gl = AplicacionWRT.instancia.gl
      let cauce : Cauce = AplicacionWRT.instancia.cauce 

      ComprErrorGL( gl, `${nombref} al inicio` )

      if ( this.texture == null ) 
         this.crearTexturaWebGL()
      
      Textura.actual = this 
      cauce.fijarEvalText( true, this.texture )

      ComprErrorGL( gl, `${nombref} al final` )
   }
   // -------------------------------------------------------------------------------------
   // Métodos estáticos ('static') o de clase (no se ejecutan sobre una instancia)

   public static desactivar(  ) : void  
   {
      let cauce : Cauce = AplicacionWRT.instancia.cauce 
      Textura.actual = null 
      cauce.fijarEvalText( false, null )
   }
   // --------------------------------------------------------------------
   

   /**
    * Crea un objeto textura y espera a leerlo desde el servidor
    * 
    * @param url (string) URL del archivo de textura en el servidor 
    * @returns (Textura) textura leída
    */
   public static async crear( url : string ) : Promise<Textura>
   {
      const nombref : string = 'LeerTextura:'
      let textura = new Textura( url )
      await textura.leer() 
      return textura
   }
   // --------------------------------------------------------------------
   
   /**
    * Hace push (en la pila de texturas) de la textura actualmente activada
    * (si no hay ninguna textura activada, introduce 'null')
    */
   public static push() : void 
   {
      const nombref : string = "Material.push:"
      Textura.pila.push( Textura.actual )
   }
   // --------------------------------------------------------------------

   /**
    * Hace pop de la pila de texturas (la pila no puede estar vacía)
    * - Lee la textura en el top de la pila.
    * - Si esa textura es 'null', desactiva las texturas, en otro caso activa esa textura.
    * 
    */
   public static pop() : void 
   {
      const nombref : string = "Material.pop:"
      let pt = Textura.pila

      if ( pt.length == 0 )
         throw new Error(`${nombref} la pila está vacía`)

      let text = pt[ pt.length-1 ]
      pt.pop()
      
      if ( text == null )
         Textura.desactivar()
      else
         text.activar()
   }
}
// -----------------------------------------------------------------------------------------




