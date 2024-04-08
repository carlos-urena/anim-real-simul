import { Log, ComprErrorGL, Assert, html, Milisegundos,
         ContextoWebGL, EstadoRaton,
         Ejes, 
         Cuadrado
       } from "./utilidades.js"
import { Cauce, CrearCauce } from "./cauce.js"
import { ObjetoVisualizable } from "./objeto-visu.js"
import { CamaraOrbital, Viewport } from "./camaras.js"
import { Vec3, Vec4, Mat4, CMat4, Vec3DesdeColorHex } from "./vec-mat.js"
import { Textura } from "./texturas.js"
import { CrearInputCheckbox, CrearSelector, CrearInputColor, CrearInputSlider } from "./controles.js"

// -------------------------------------------------------------------

/**
 * Clase con la funcionalidad básica de una aplicación PCG
 */
export class AplicacionWRT 
{
   
    // ---------------------------------------
   // Variables 'de clase' (o estáticas)
   // ---------------------------------------

   /**
    * instancia única (singleton) de esta clase ( estática )
    * se lee con el método 'instancia' (tipo get, estático)
    */
   private static instancia_apl_pcg : AplicacionWRT | null = null 


   // ------------------------------
   // Variables de instancia
   // ------------------------------

   /**
    * 'rendering context' de WebGL
    */
   private gl_act : WebGL2RenderingContext | WebGLRenderingContext

   
   /**
    * elemento html (de tipo 'canvas') sobre el que se realiza el rendering
    */
   private canvas! : HTMLCanvasElement  
   
   /**
    * elemento html (div) que contiene el canvas
    */
   private contenedor : HTMLDivElement  
   
   // identificador del elemento html (div) que contiene el canvas
   private id_contenedor : string

   // elemento html (div) que contiene los controles
   private controles : HTMLDivElement  
   
   // identificador del elemento html (div) que contiene el canvas
   private id_controles : string
   
   // objeto Cauce
   private cauce_actual! : Cauce 

   // estado del ratón 
   private estado_raton : EstadoRaton = new EstadoRaton

   
   
   // elemento HTML (div) en el pie de la página, donde se visualizan los mensajes de estado 
   // (null al principio o si no se encuentra)
   private pie : HTMLElement | null = null 

   
   // cuadrado que dibujamos para lanzar el FS de ray-tracing
   private cuadrado : Cuadrado 

   // objeto que actualmente se está visualizando 
   private indice_objeto_actual : number = 0 

   // true si queremos visualizar aristas, false si no,
   private visualizar_aristas : boolean = false 

   // elemento HTML de tipo 'input' (checkbox) para el botón de las aristas
   private input_boton_aristas : HTMLInputElement | null = null

   // true si queremos visualizar las normales, false si no,
   private visualizar_normales : boolean = false 

   // elemento HTML de tipo 'input' (checkbox) para el botón de visualizar normales
   private input_boton_normales : HTMLInputElement | null = null

   // elemento HTML de tipo 'input' para el slider del parámetro S
   private input_param_S : HTMLInputElement | null = null

   // valor del parámetro S
   private param_S : number = 0.1

   // color inicial al visualizar un frame (Vec3 con valores entre 0 y 1)
   private color_defecto : Vec3 = new Vec3([ 0.8, 0.8, 0.8 ])

   // elemento HTML de tipo 'input' (color) para el color inicial al visualizar un frame
   private input_color_defecto : HTMLInputElement | null = null 

  
   // índice de la fuente de luz actual
   private ind_fuente : number = 0

   // elemento HTML de tipo 'input' (checkbox) para el botón de activar/desactivar iluminación
   private input_boton_iluminacion : HTMLInputElement | null = null

   // indica si la iluminación está activada o no 
   private iluminacion : boolean = true

  

   // estructura con algunos objetos de test
   //private objs_test : ObjsTest

    // cámara en uso
    //private camara : CamaraOrbital 

    // ángulos de la cámara en grados 

    private ac_long_grad : number = 45.0 
    private ac_lat_grad  : number = 45.0 
   
   // -------------------------------------------------------------------------
   
   /**
    * método 'get' (estático) para obtener la instancia (única) de AplicacionWRT 
    * (si es nula se produce un error)
    */
   public static get instancia() : AplicacionWRT 
   {
      if ( AplicacionWRT.instancia_apl_pcg == null )
         throw Error("AplicacionWRT.instancia: no se puede obtener la instancia, todavía no se ha creado")

      return AplicacionWRT.instancia_apl_pcg
   }
   // -------------------------------------------------------------------
 

   /**
    * método 'get' (estático) para devolver la instancia (posiblemente 'null' si no se ha creado todavía)
    */
   public static get instancia_o_null() : AplicacionWRT | null  
   {
      return AplicacionWRT.instancia_apl_pcg
   } 
   // -------------------------------------------------------------------

   /**
    * método (estático) para destruir la instancia única de la aplicación
    */
   public static anularInstancia() : void 
   {
      let inst = AplicacionWRT.instancia_apl_pcg 

      if ( inst != null )
      {
         console.log("Destruyendo la instancia.")
         inst.desactivarFGEs()
         AplicacionWRT.instancia_apl_pcg = null 
      }
      else 
         console.log("La instancia ya estaba destruida.")
   }

   // -------------------------------------------------------------------

   /**
    * Constructor de AplicacionWRT 
    * 
    *   * Registra la instancia como la instancia única (una sola vez)
    *   * Inicializa las variables de instancia que no dependan del Cauce y que 
    *     no requieren descargar archivos del servidor
    */
   constructor(  )
   {
      const nombref : string = "AplicacionWRT.constructor:" 

      // Registrar esta instancia como la instancia única (singleton) de la clase AplicacionWRT
      // (comprobando antes que no estaba ya creada)
      
      if ( AplicacionWRT.instancia_apl_pcg != null )
         throw Error(`${nombref} intento de crear más de una instancia de la clase 'AplicacionWRT'`)
      
      AplicacionWRT.instancia_apl_pcg = this 

      // Recuperar los elementos HTML que debe haber en la página y que esta aplicación usa.

      this.id_contenedor = "contenedor_canvas_pcg"  
      this.id_controles  = "contenedor_controles_pcg"

      this.contenedor  = this.obtenerElementoContenedor( this.id_contenedor )
      this.controles   = this.obtenerElementoControles( this.id_controles )
      this.canvas      = this.obtenerCrearElementoCanvas( this.contenedor )
      
      // Obtener el contexto WebGL a partir del elemento canvas
      
      this.gl_act = this.obtenerContextoWebGL( this.canvas ) 

      // Crea la cámara 3D y el objeto para visualizar los ejes

      //this.camara = new CamaraOrbital("cámara orbital")
      //this.ejes   = new Ejes( )

      this.cuadrado = new Cuadrado()


   }
   // -------------------------------------------------------------------------

   /**
    * Muestra una línea en la caja de estado al pie de la página
    * (si no existe el elemento 'pie', no hace nada)
    * 
    * @param linea (string) linea a visualizar
    */
   public set estado( linea : string ) 
   {
      if (this.pie == null )
         this.pie = document.getElementById("pie")
      if (this.pie == null )
         return
      
      this.pie.textContent = linea
   }
   // -------------------------------------------------------------------------
   /**
    * Inicialización de la aplicación (posterior al constructor)
    * 
    *    * Crea el cauce gráfico de la aplicación
    *    * Instala los gestores de eventos (así no se invocan nunca antes de que haya un cauce)
    *    * Añade objetos con texturas o modelos que deben descargarse del servidor.
    */
   public async inicializar() : Promise<void>
   {
      const nombref : string = "AplicacionWRT.inicializar:" 

      Assert( AplicacionWRT.instancia == this, "Esto no puede saltar...")

      //og(`${nombref} inicio`)
      
      // crear el cauce
      this.cauce_actual = await CrearCauce( this.gl_act )
   
      // definir funciones gestoras de eventos 
      this.activarFGEs()

      // crear los elementos de controles de la aplicación (elementos HTML)
      this.crearElementosControles()
      
      // redimensionar el canvas y visualizar la 1a vez
      this.redimensionarVisualizar()

      this.estado = "Inicialización completa."

      //Log(`${nombref} fin`)
   }
   // -------------------------------------------------------------------------

   /**
    * Define los métodos gestores de eventos (MGE) de la aplicación
    */
   public activarFGEs()
   {
      this.canvas.onmousedown   = (me) => this.fgeRatonBotonPulsar(me)
      this.canvas.onmouseup     = (me) => this.fgeRatonBotonLevantar(me)
      this.canvas.oncontextmenu = (me) => this.fgeMenuContexto(me) 
      this.canvas.onwheel       = (we) => this.fgeRatonRueda(we)  
      document.onkeyup          = (ke) => this.fgeTecladoLevantarBoton(ke)
      window.onresize           = (ev) => this.redimensionarVisualizar()
     
   }
   // -------------------------------------------------------------------------

   /**
    * Desconecta las funciones gestoras de eventos del canvas o la ventana
    * (se restauran las FGEs por defecto que estaban antes de ejecutar el constructor)
    * Se debe llamar si ocurre un error y 'this' queda inutilizable.
    */
   public desactivarFGEs()
   {
      this.canvas.onmousedown   = null 
      this.canvas.onmouseup     = null 
      this.canvas.oncontextmenu = null 
      this.canvas.onwheel       = null 
      document.onkeyup          = null 
      window.onresize           = null 
   }
   // ------------------------------------------------------------------------

   /**
    * Leer el cauce actual de la aplicación
    */
   public get cauce() : Cauce 
   {
      if ( this.cauce_actual == null )
         throw Error(`AplicacionWRT.cauce: se ha intentado leer el cauce actual, pero es nulo`)
      return this.cauce_actual 
   }
   // ------------------------------------------------------------------------

   /**
    * Leer el contexto actual de la aplicación
    */
   public get gl() : ContextoWebGL 
   {
      if ( this.gl_act == null )
         throw Error(`AplicacionWRT.gl: se ha intentado leer el contexto actual, pero es nulo`)
      return this.gl_act 
   }
   // ------------------------------------------------------------------------- 
   
   /**
    * Lee si la ilumniación está activada o no lo está
    */
   public get iluminacion_activada() : boolean 
   { 
      return this.iluminacion 
   }
   // ------------------------------------------------------------------------- 
   /**
    * Crea el check box para visualizar aristas si/no 'this.input_boton_aristas'
    */
   private crearCheckboxAristas()
   {
      const nombref : string = 'AplicacionWRT.crearBotonAristas'

      this.input_boton_aristas = CrearInputCheckbox( this.controles, this.visualizar_aristas,
                                       'id_boton_aristas', 'Visu.&nbsp;aristas' )
      this.input_boton_aristas.onclick = () => this.fijarVisualizarAristas( ! this.visualizar_aristas )
   }
   // ------------------------------------------------------------------------- 

   /**
    * Crea el check box para visualizar aristas si/no 'this.input_boton_normales'
    */
   private crearCheckboxNormales()
   {
      const nombref : string = 'AplicacionWRT.crearCheckboxNormales'

      this.input_boton_normales = CrearInputCheckbox( this.controles, this.visualizar_normales,
                                       'id_boton_normales', 'Visu.&nbsp;normales' )
      this.input_boton_normales.onclick = () => this.fijarVisualizarNormales( ! this.visualizar_normales )
   }
   // ------------------------------------------------------------------------- 

   /**
    * Crea el check box para visualizar aristas si/no 'this.input_boton_normales'
    */
   private crearCheckboxIluminacion()
   {
      const nombref : string = 'AplicacionWRT.crearCheckboxIluminacion'

      this.input_boton_iluminacion = CrearInputCheckbox( this.controles, this.iluminacion,
                                       'id_boton_iluminacion', 'Iluminación' )
      this.input_boton_iluminacion.onclick = () => this.fijarIluminacion( ! this.iluminacion )
   }
   // ------------------------------------------------------------------------- 

   
   // -------------------------------------------------------------------------


   /**
    * Crea un input de color para el color inicial por defecto para objetos que no tengan color propio
    * (asigna a 'this.input_color_inicial)
    */
   private crearInputColorDefecto() : void  
   {
      this.input_color_defecto = CrearInputColor( this.controles, new Vec3([ 1.0, 0.0, 0.0 ]), "id_test_color", "Color&nbsp;defecto" )
      this.input_color_defecto.value = this.color_defecto.hexColorStr() 
      this.input_color_defecto.oninput = (e) => this.fijarColorDefecto( Vec3DesdeColorHex( this.input_color_defecto!.value ))
   }
   
   // -------------------------------------------------------------------------
   /**
    * Fija el valor del parámetro S en el cauce actual
    * @param nuevo_param_s (string) nuevo valor del parámetro S
    */
   private fijarParamS( nuevo_param_s : String ) : void
   {
      const nombref : string = 'AplicacionWRT.fijarParamS:'
      this.param_S = parseFloat( this.input_param_S!.value )
      let msg = `Nuevo valor del parámetro S == ${this.param_S}`
      this.estado = msg

      this.visualizarFrame()
   }
   // -------------------------------------------------------------------------

   /**
    * Crea un input tipo 'range slider' para el parámetro S de los shaders
    * (asigna a ??)
    */
   private crearSliderParamS() : void  
   {
      this.input_param_S = CrearInputSlider( this.controles, this.param_S, 0.0, 1.0, 0.01, "id_slider_param_s", "Parámetro&nbsp;S" )
     
      //sl.oninput = (e) => this.fijarColorDefecto( Vec3DesdeColorHex( this.input_color_defecto!.value ))
      this.input_param_S.oninput = (e) => this.fijarParamS( this.input_param_S!.value ) 
   }
   // -------------------------------------------------------------------------

   /**
    * Crea diversos controles
    */
   private crearElementosControles()
   {
      const nombref : string = 'AplicacionWRT.crearElementosControles:'

      this.crearCheckboxAristas()
      this.crearCheckboxNormales()
      this.crearCheckboxIluminacion()
      this.crearInputColorDefecto()
      this.crearSliderParamS()

      Log(`${nombref} controles creados ok.`)
   }
   // ------------------------------------------------------------------------- 

   /**
    * Ignora un evento de tipo "menu-contexto" y no lo procesa
    * (permite gestionar la camara con el botón derecho, sin que aparezca un menú al 
    * hacer click con el botón derecho)
    * @param me (MouseEvent) evento a ignorar
    * @returns (Boolean) false
    */
   ignorarMenuContexto( me : MouseEvent )
   {
      me.preventDefault()
      return false 
   }
   // -------------------------------------------------------------------------
    
   /**
    * Pone el ancho y alto del "buffer" (pixels del framebuffer) al mismo 
    * tamaño que el "client rect" (tamaño en la ventana del navegador)
    * Después redibuja el frame.
    * 
    */ 
   public redimensionarVisualizar() : void 
   {
      const nombref : string = "AplicacionWRT.redimensionarVisualizar:"
      if ( this.canvas == null )
      {
         Log(`${nombref} no hay canvas, salgo`)
         return
      }

      // set the size of the drawingBuffer based on the size it's displayed.
      this.canvas.width  = this.canvas.clientWidth
      this.canvas.height = this.canvas.clientHeight

      this.visualizarFrame() 
   }
   // -------------------------------------------------------------------------

   /**
    * Recupera el elemento contenedor, asigna 'this.contenedor'
    * @param id_contenedor (string) identificador del elemento contenedor en la página
    */
   obtenerElementoContenedor( id_contenedor : string ) : HTMLDivElement
   {
      const nombref : string = "AplicacionWRT.obtenerElementoContenedor:" 

      let contenedor : HTMLElement | null = document.getElementById( id_contenedor )
      if ( contenedor == null )
         throw Error(`${nombref} no puedo inicializar la aplicación PCG, no encuentro el contenedor con id "${id_contenedor}" en la página`)
      if ( !( contenedor instanceof HTMLDivElement))
         throw Error(`${nombref} no puedo inicializar la aplicación PCG, el contenedor no es un elemento 'div'`)
      Log(`${nombref} contenedor '${id_contenedor}' encontrado`)
      return contenedor 
   }
   // -------------------------------------------------------------------------

   /**
    * Recupera el elemento (tipicamente 'div') donde se añaden los controles de la aplicación
    * 
    * @param id_controles (string) identificador del elemento para los controles
    * @returns (HTMLDivElement) elemento 'div' donde poner los controles.
    */
   obtenerElementoControles( id_controles : string  ) : HTMLDivElement
   {
      const nombref : string = "AplicacionWRT.obtenerElementoContenedor:" 

      let controles : HTMLElement | null = document.getElementById( id_controles )
      if ( controles == null )
         throw Error(`${nombref} no puedo inicializar la aplicación PCG, no encuentro el 'div' para controles con id ${id_controles}`)
      if ( !( controles instanceof HTMLDivElement))
         throw Error(`${nombref} no puedo inicializar la aplicación PCG, el elemento para controles no es un elemento 'div'`)
      Log(`${nombref} div de controles '${id_controles}' encontrado`)
      return controles 
   }
   // -------------------------------------------------------------------------
   
   /**
    *  Recupera o crea el canvas como hijo del contenedor
    *  Si el contenedor tiene un elemento canvas, lo recupera 
    *  Si el contenedor no tiene un elemento canvas, lo crea (como hijo directo)
    *  Si el contenedor tiene más de un elemento canvas, produce un error
    *  @param contenedor (HTMLDivElement) elemento contenedor donde se busca o crea el canvas 
    */
   obtenerCrearElementoCanvas( contenedor : HTMLDivElement ) : HTMLCanvasElement 
   {
      const nombref : string = "AplicacionWRT.obtenerCrearElementoCanvas:" 

      let canvas : HTMLCanvasElement | null = null 
      let lista  : NodeListOf<HTMLCanvasElement> = contenedor.querySelectorAll("canvas")
      
      if ( lista.length == 0 )
      {  
         canvas = document.createElement( "canvas")
         if ( canvas == null )
            throw Error(`${nombref} error al crear el canvas, es 'null'`)
         contenedor.appendChild( canvas )
         Log(`${nombref} elemento canvas creado y añadido al contenedor ok.`)
      }
      else if ( lista.length == 1 )
      {  
         canvas = lista[0]
         Log(`${nombref} elemento canvas encontrado ok.`)
      }
      else
         throw Error(`${nombref} se ha encontrado más de un elemento canvas en el contenedor`)
      
      return canvas
   }
   // -------------------------------------------------------------------------
   
   /**
    * Recupera el contexto WebGL 
    * ('this.canvas' debe estar creado ya)
    */
   obtenerContextoWebGL( canvas : HTMLCanvasElement ) : WebGL2RenderingContext | WebGLRenderingContext
   {
      const nombref : string = "AplicacionWRT.obtenerContextoWebGL:" 

      let gl : RenderingContext | null = this.canvas.getContext( "webgl2" )
      if ( gl == null )
         gl = this.canvas.getContext( "webgl" )
      if ( gl == null )
         throw Error(`${nombref} no se puede obtener un contexto del canvas, se obtiene 'null'` )
      
      if ( gl instanceof WebGL2RenderingContext )
         Log(`${nombref} contexto de rendering de WebGL 2 recuperado ok`)
      else if ( gl instanceof WebGLRenderingContext )
         Log(`${nombref} contexto de rendering de WebGL 1 recuperado ok`)
      else 
         throw Error(`${nombref} no se puede obtener un contexto WebGL 1 ni WebGL 2 del canvas` )

      return gl
   }
    
   // -------------------------------------------------------------------

   /**
    * Visualizar un frame, por ahora es un simple test
    */
   visualizarFrame() : void 
   {
      const nombref : string = 'AplicacionWRT.visualizarFrame:' 
      Log(`${nombref} inicio `)
      let gl    = this.gl_act 
      let cauce = this.cauce_actual 

      let ancho = gl.drawingBufferWidth 
      let alto  = gl.drawingBufferHeight
      
      cauce.activar()  

      gl.disable( gl.DEPTH_TEST )
      gl.viewport( 0, 0, ancho, alto )
      gl.clearColor( 0.0, 0.0, 0.0, 1.0 )
      gl.clear( this.gl_act.COLOR_BUFFER_BIT ) // no hace falta (el cuadrado lo ocupará todo)

      cauce.fijarParamS( this.param_S )
      cauce.fijarNumColsRows( ancho, alto )
      cauce.fijarAngCamGrad( this.ac_long_grad, this.ac_lat_grad )

      this.cuadrado.visualizar()
      
      ComprErrorGL( gl, `${nombref} al final`)
   }
   // ---------------------------------
   /**
    * Método que se ejecuta cuando se produce un evento de tipo 'contextmenu', no hace nada,
    * pero evita que aparezca el 'context menu' que por defecto aparece pulsando
    * con el botón derecho del ratón  ('preventdefault()')
    * 
    * @param me (MouseEvent)
    */
   fgeMenuContexto( me : MouseEvent ) : Boolean
   {
      const nombref = 'AplicacionWRT.fgeMenuContexto'
      me.stopImmediatePropagation()
      me.preventDefault()

      return false ;
   }
   // ---------------------------------

   /**
    * Método que se ejecuta cuando se pulsa (se baja) un botón del ratón 
    * (también se ejecuta cuando se produce un evento de tipo 'contextmenu' de forma 
    * que se puede evitar que aparezca el 'context menu' que por defecto aparece pulsando
    * con el botón derecho del ratón)
    * 
    * @param e (MouseEvent)
    */
   fgeRatonBotonPulsar( e : MouseEvent ) : Boolean
   {
      const nombref = 'AplicacionWRT.mgeRatonBotonPulsar'
      e.stopImmediatePropagation()
      e.preventDefault()

      if ( e.button == 2 ) // 2 --> botón derecho
      {
         this.contenedor.style.cursor = 'move'
         this.estado_raton.boton_der_abajo = true
         this.estado_raton.inicio_x = e.offsetX
         this.estado_raton.inicio_y = e.offsetY 
         this.canvas.onmousemove = me => this.fgeRatonArrastre(me)
         //Log(`${nombref} bajada. pos x,y == ${this.estado_raton.inicio_x}, ${this.estado_raton.inicio_y}`)
      }
      return false 
   }

   // ------------------------------------------------------------------------------------


   /**
    * Fija el color inicial por defecto para los objetos
    * 
    * @param nuevo_color_inicial (Vec3) nuevo color inicial (componentes entre 0 y 1)
    */
   fijarColorDefecto( nuevo_color_inicial : Vec3 ) : void
   {
      const nombref = 'AplicacionWRT.fijarColorDefecto:'
      
      this.color_defecto = nuevo_color_inicial
      const msg : string = `Color por defecto fijado a ${this.color_defecto.toStringPercent()}`
      this.estado = msg
      //Log( `${nombref} ${msg}` )
      if ( this.input_color_defecto != null )
         this.input_color_defecto.value = this.color_defecto.hexColorStr() 
      this.visualizarFrame()
   }
   // ------------------------------------------------------------------------------------
   
   /**
    * Activa o desactiva la visualización de aristas
    * 
    * @param nuevo_visualizar_aristas (Boolean) true para activar, false para desactivar 
    */
   fijarVisualizarAristas( nuevo_visualizar_aristas : boolean  ) : void 
   {
      const nombref = 'AplicacionWRT.fijarVisualizarAristas'
      this.visualizar_aristas = nuevo_visualizar_aristas 

      if ( this.input_boton_aristas != null )
         this.input_boton_aristas.checked = this.visualizar_aristas 
      const msg : string = `Visualizar aristas: ${this.visualizar_aristas ? "activado" : "desactivado"}`
      this.estado = msg 
      this.visualizarFrame()
   }
    // ------------------------------------------------------------------------------------
   
   /**
    * Activa o desactiva la visualización de normales
    * 
    * @param nuevo_visualizar_normales (Boolean) true para activar, false para desactivar 
    */
   fijarVisualizarNormales( nuevo_visualizar_normales : boolean  ) : void 
   {
      const nombref = 'AplicacionWRT.fijarVisualizarNormales'
      this.visualizar_normales = nuevo_visualizar_normales 

      if ( this.input_boton_normales != null )
         this.input_boton_normales.checked = this.visualizar_normales 
      const msg : string = `Visualizar normales: ${this.visualizar_normales ? "activado" : "desactivado"}`
      this.estado = msg 
      this.visualizarFrame()
   }

    // ------------------------------------------------------------------------------------
   
   /**
    * Activa o desactiva la iluminacion
    * 
    * @param nuevo_visualizar_normales (boolean) true para activar, false para desactivar 
    */
   fijarIluminacion( nuevo_iluminacion : boolean  ) : void 
   {
      const nombref = 'AplicacionWRT.fijarIluminacion'
      this.iluminacion = nuevo_iluminacion

      if ( this.input_boton_iluminacion != null )
         this.input_boton_iluminacion.checked = this.iluminacion 
      const msg : string = `Iluminación: ${this.iluminacion ? "activada" : "desactivada"}`
      this.estado = msg 
      this.visualizarFrame()
   }
   // ------------------------------------------------------------------------------------

   /**
    * Función que se ejecuta al levantar un botón del teclado 
    * 
    * @param e (KeyboardEvent)
    * @returns (Boolean) siempre 'false'
    */
   fgeTecladoLevantarBoton(  e : KeyboardEvent ) : boolean
   {
      const nombref = 'AplicacionWRT.fgeLevantarBoton'
      e.stopImmediatePropagation()
      e.preventDefault()
      
      switch ( e.code )
      {
         case 'KeyW' : 
            this.fijarVisualizarAristas( ! this.visualizar_aristas ) 
            break
         case 'KeyN' : 
            this.fijarVisualizarNormales( ! this.visualizar_normales ) 
            break
         case 'KeyE' :  // producir un error al pulsar E (debug) 
            //Log(`SE HA PULSADO 'E'`)
            //Assert( 0.0 < 1.0 && 1.0 < 0.0 )
            //Assert( 0.0 < 1.0 && 1.0 < 0.0, `esto es un assert imposible de cumplir, 1.0 < 0.0` ) // salta siempre
            //let p = await LeerArchivoTexto("pepe.txt")  //--> para probar esto hay que hacer 'async' esta FGE
            break 
      }
      return false 
   }
   // ------------------------------------------------------------------------------------

   /**
    * Función que se ejecuta cuando se mueve el ratón con el botón derecho pulsado
    * 
    * @param e (MouseEvent) evento 
    * @returns (Boolean) siempre 'false'
    */
   fgeRatonArrastre( e : MouseEvent ) : Boolean 
   {
      const nombref = 'AplicacionWRT.fgeRatonArrastre'
      e.stopImmediatePropagation()
      e.preventDefault()

      Log(`${nombref} movement x,y == ${e.movementX} ${e.movementY}`)

      const dh : number = -e.movementX
      const dv : number =  e.movementY 

      // actualizar ángulos de cámara
      this.ac_long_grad = this.ac_long_grad + dh 
      this.ac_lat_grad  = this.ac_lat_grad + dv 

      this.visualizarFrame()
      return false
   }
   // ------------------------------------------------------------------------------------

   /**
    * Función que se ejecuta cuando se levantar un botón del raton 
    * @param e 
    * @returns (Boolean) siempre 'false'
    */
   fgeRatonBotonLevantar( e : MouseEvent ) : Boolean 
   {
      const nombref = 'AplicacionWRT.botonRatonLevantar'
      e.stopImmediatePropagation()
      e.preventDefault()
      
      if ( e.button == 2 ) // 2 --> botón derecho 
      {
         this.contenedor.style.cursor = 'auto'
         this.estado_raton.boton_der_abajo = false
         this.canvas.onmousemove = null
         //Log(`${nombref} subida. pos x,y == ${e.clientX}, ${e.clientY}`)
      }
      return false
   }
   // ------------------------------------------------------------------------------------

   /**
    * Función que se ejecuta cuando se mueve la rueda del ratón 
    * @param e 
    * @returns (Boolean) siempre 'false'
    */
   fgeRatonRueda( e : WheelEvent ) : Boolean 
   {
      const nombref = 'AplicacionWRT.botonRatonArriba'
      e.stopImmediatePropagation()
      e.preventDefault()
      
      //Log(`${nombref} rueda movida, deltaY == ${e.deltaY}, delta mode == ${e.deltaMode}`)
      const signo : number = e.deltaY >= 0.0 ? +1.0 : -1.0

      //this.camara.moverZ ( signo )
      this.visualizarFrame()
      return false
   }
   // --------------------------------------------------------------------------------

   /**
    * Inicializa la instancia 'apl' de la aplicación
    * @param id_contenedor : nombre del elemento html contenedor del canvas 
    */
   public static async crear(  ) : Promise<void> 
   {
      const nombref = "AplicacionWRT.crear:" // getFuncName()

      // fijar el gestor de errores, debe 
      window.onerror = (err) => AplicacionWRT.gestionarError( err )
      window.onunhandledrejection = (err) => AplicacionWRT.gestionarError( err ) 

      console.log( `${nombref} inicio.`)
      
      document.body.style.cursor = "wait"
      var pie : HTMLElement | null = document.getElementById("pie")
      if ( pie != null )
         pie.textContent = "Inicializando ..." 
      
      // dar tiempo a que se actualize el DOM con los cambios introducidos
      //await Milisegundos( 500 )  

      let instancia_apl : AplicacionWRT | null = null 
      try 
      {
         // crear e inicializar la instancia única 
         instancia_apl = new AplicacionWRT(  )
         await instancia_apl.inicializar()
      }
      catch( err : any )
      {
         AplicacionWRT.gestionarError( err )
      }

      if ( AplicacionWRT.instancia_o_null == null )
         console.log(`${nombref} no se ha creado la aplicación`)
      else 
         console.log(`${nombref} la aplicación se ha creado sin errores`)

      // ya está 
      console.log( `${nombref} fin.`)

      // restaurar el estilo del cursor
      document.body.style.cursor = "default"  
   }

   // -------------------------------------------------------------------

   /**
    * Gestiona un error: "cierra" la aplicación y muestra el mensaje de error. Da estos pasos:
    * 
    * - Los elementos de la página dejan de ser visibles, se desactivan las FGEs.
    * - Se anula la instancia de la aplicación (si no era nula ya).
    * - La página muestra únicamente el mensaje de error y no se puede interactuar con ella.
    * 
    * @param err  objeto de error, puede ser de cualquier tipo   
    */
   public static gestionarError( err : any ) : void 
   {
      const nombref = "ErrorAplicacionWRT:"

      let descripcion : string = "(no hay más información del error)"

      console.log(`${nombref} err constructor name == '${err.constructor.name}'`)

      if ( err instanceof PromiseRejectionEvent )
         descripcion = err.reason
      //else if ( err.hasOwnProperty('message') )
      else if ( err.message !== undefined )
         descripcion = err.message
      //else if ( err.hasOwnProperty('toString') )
      else if ( err.toString !== undefined )
         descripcion = err.toString()
      else 
         descripcion = `sin información del motivo (el objeto de error es de tipo '${err.constructor.name}').`

      
      console.log(`${nombref} ha ocurrido un error. La aplicación se desactivará.`)
      console.log(`${nombref} ${descripcion}`)

      let instancia = AplicacionWRT.instancia_o_null 
      
      // eliminar la instancia si todavía existe
      if ( instancia != null )
      { 
         instancia.desactivarFGEs() // desactiva las FGEs, restaura valores anteriores (ver la función)
         AplicacionWRT.anularInstancia() // desconecta la aplicación para que no se vuelva a usar
      }

      // desactivar gestores de eventos de error (se activaron al inicializar)
      window.onerror = null 
      window.onunhandledrejection = null  

      // mostrar un cuadro con el error (en una capa sobre la ventana)
      const texto_html : string = `
            <div style='
               z-index    : 1 ;
               position   : absolute;
               top        : 50%;
               left       : 50%;
               font-size  : 14pt ;
               transform  : translate(-50%, -50%);
               text-align : center ;
            '>
            Ha ocurrido un error. Incluyo aquí la descripción disponible.
            <div style='
               color : rgb(100%,40%,40%);
            '>
               ${descripcion}
            </div>
         </div>
      `
      let cuadro :HTMLDivElement = document.createElement('div') 
      cuadro.setAttribute("style", ` 
         width:100%; height:100% ; background-color: rgb(20%,20%,20%);
         position: absolute ; top:0px ; left:0px;
      `)

      cuadro.innerHTML = texto_html 

      let lista_body = document.getElementsByTagName('body')
      let body = lista_body[0]
      if ( body == null )
         return 

      body.appendChild( cuadro )

      
   }

}
// -------------------------------------------------------------------

