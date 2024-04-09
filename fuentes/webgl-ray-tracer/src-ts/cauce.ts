

import { Assert, ComprErrorGL, LeerArchivoTexto, Log,
         CrearFloat32ArrayV2, CrearFloat32ArrayV3, CrearFloat32ArrayV4 } from "./utilidades.js"
import { Vec2, Vec3, Vec4, Mat4, CMat4 } from "./vec-mat.js"

// -------------------------------------------------------------------------

/**
 * Convierte un booleano a un 'number' (entero).
 * Si 'b' es true, devuelve 1, en otro caso devuelve 0.
 * 
 * @param b booleano a convertir
 * @returns entero convertido
 */
function b2n( b : Boolean ) : number 
{
    return b ? 1 : 0 
} 

// -------------------------------------------------------------------------

function glsl( s : TemplateStringsArray ) : string 
{
    return s.raw[0]
}

// -------------------------------------------------------------------------

export async function CrearCauce( gl : WebGLRenderingContextBase ) : Promise<Cauce>
{
    let cauce : Cauce = new Cauce( gl )
    await cauce.inicializar()
    return cauce
} 
// -------------------------------------------------------------------------

export class Cauce
{
    // ---------------------------------------------------------------------------
    // Propiedades de la clase ("estáticas"), no específicas de cada instancia
    // (de solo lectura, 'const')
    
    // número total de atributos de vértice que se gestionan en el objeto programa
    public static readonly numero_atributos : number = 4
 
    /** 
     ** nombres descriptivos para los índices de los atributos que gestiona el cauce.
     */
    public static readonly indice_atributo =  
    {   
        posicion    : 0, 
        coords_text : 1
    }

    
    // ---------------------------------------------------------------------------
    // Variables de instancia:

    // objeto programa 
    private programa! : WebGLProgram 

    private param_s      : number = 0.0 
    private ac_long_grad : number = 0.0 
    private ac_lat_grad  : number = 0.0
    private cam_dist     : number = 2.0
    private naa          : number = 1
    private eval_text    : boolean = true
    private solo_primarios : boolean = false 
    
    // contexto WebGL, dado en el constructor 
    private gl! : WebGLRenderingContext | WebGL2RenderingContext 

    // objetos shaders 
    private fragment_shader!  : WebGLShader 
    private vertex_shader!    : WebGLShader  

    private loc_param_s      : WebGLUniformLocation | null = null
    private loc_iResolution  : WebGLUniformLocation | null = null
    private loc_ac_long_grad : WebGLUniformLocation | null = null
    private loc_ac_lat_grad  : WebGLUniformLocation | null = null
    private loc_cam_dist     : WebGLUniformLocation | null = null
    private loc_eval_text    : WebGLUniformLocation | null = null
    private loc_naa          : WebGLUniformLocation | null = null
    private loc_solo_primarios : WebGLUniformLocation | null = null
    
    // ---------------------------------------------------------------------------
    // Métodos 
    // ---------------------------------------------------------------------------

    /**
     * Inicializa el objeto cauce, es decir:
     * compila los shaders y enlaza el objeto programa, inicializa uniforms.
     * @param gl contexto WebGL en el cual se usará el objeto programa 
     */
    constructor( gl : WebGLRenderingContextBase )
    {
        const nombref : string = 'Cauce.constructor'
        if ( gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext )
            this.gl = gl 
        else 
            throw Error( `${nombref} el parámetro 'gl' del constructor es de un tipo incorrecto`)
        
       
    }
    // ---------------------------------------------------------------------------

    async inicializar() : Promise<void>
    {
        const nombref : string = 'Cauce.inicializar:'
        
        await this.crearObjetoPrograma()
        this.inicializarUniforms()
        this.imprimeInfoUniforms() 

        Log(`${nombref} shaders compilados y objeto 'Cauce' creado con éxito.`)
    }
    // ---------------------------------------------------------------------------

    /**
     *  Lee las 'locations' de todos los uniforms y les da un 
     *  valor inicial por defecto. También inicializa algunas variables de estado.
     */
    private inicializarUniforms() : void
    {
        const nombref : string = 'Cauce.leerLocation'
        if ( this.gl == null ) throw Error(`${nombref} leerLocation - this.gl es nulo`)
        let gl = this.gl

        gl.useProgram( this.programa );
        
        // fijar el valor del parámetro S
        this.loc_param_s = this.leerLocation( "u_param_s" )
        this.fijarParamS( this.param_s )

        // leer el location de la resolución
        this.loc_iResolution = this.leerLocation( "iResolution" );
        

        // ángulos de la cámara 
        this.loc_ac_long_grad = this.leerLocation( "u_ac_long_grad" )
        this.loc_ac_lat_grad  = this.leerLocation( "u_ac_lat_grad" )
        this.fijarAngCamGrad( this.ac_long_grad, this.ac_lat_grad )
        
        this.loc_eval_text = this.leerLocation( "u_eval_text" )

        // distancia de la cámara al look-at
        this.loc_cam_dist = this.leerLocation( "u_cam_dist" )
        this.fijarCamDist( this.cam_dist )

        // booleano para trazar únicamente rayos primarios 
        this.loc_solo_primarios = this.leerLocation( "u_solo_primarios" )
        this.fijarSoloPrimarios( this.solo_primarios )

        // valor de 'naa' 
        this.loc_naa = this.leerLocation( "u_naa" )
        this.fijarNaa( this.naa )


        // desactivar objeto programa
        gl.useProgram( null ); 
    }
    // ---------------------------------------------------------------------------

    private leerLocation( nombre : string ) : WebGLUniformLocation | null  
    {
        const nombref : string = 'Cauce.leerLocation:'
        if ( this.gl == null ) throw Error(`${nombref} leerLocation - this.gl es nulo`)
        
        const loc = this.gl.getUniformLocation( this.programa, nombre )
        if ( loc == null )
            //throw Error(`${nombref} no se encuentra el uniform '${nombre}'`)
            Log(`${nombref} Advertencia: el uniform '${nombre}' no aparece en los shaders o no se usa en la salida`)
        
        return loc 
    }
    // ---------------------------------------------------------------------------

    private imprimeInfoUniforms() : void 
    {
        
    }
    // ---------------------------------------------------------------------------


    /**
     *  Compila y enlaza el objeto programa 
     * (deja nombre en 'id_prog', debe ser 0 antes)
     */
    private async crearObjetoPrograma() : Promise<void>
    {
        const nombref : string = 'Cauce.crearObjetoPrograma:'
        //if ( this.gl == null ) throw Error(`${nombref} leerLocation - this.gl es nulo`)
        let gl = this.gl!
        
        ComprErrorGL( gl, `${nombref} error OpenGL al inicio`)
        Assert( this.programa == null, `${nombref} 'id_prog' no es nulo` )

        // Leer los fuentes GLSL

        
        const nombre_archivo_vs = "/glsl/wrt-vertex-shader.glsl"
        //const nombre_archivo_fs = "/glsl/wrt-fs-test.glsl"   // fragment shader de test
        //const nombre_archivo_fs = "/glsl/wrt-fragment-shader.glsl" // fragment shader del Ray-tracer
        const nombre_archivo_fs = "/glsl/ejer-wrt-fragment-shader.glsl"  // fragment shader del Ray-tracer, versión con modificiones varias de los ejercicios

        const texto_vertex_shader   : string = await LeerArchivoTexto( nombre_archivo_vs )
        const texto_fragment_shader : string = await LeerArchivoTexto( nombre_archivo_fs )
        
        // Crear el objeto programa 
        let programa : WebGLProgram | null = gl.createProgram()
        if ( programa == null )
            throw Error(`${nombref} no se ha podido crear el objeto programa`)
        
        this.programa = programa 
        
        // Adjuntarle los shaders al objeto programa
        this.vertex_shader   = this.compilarAdjuntarShader( gl.VERTEX_SHADER,   nombre_archivo_vs, texto_vertex_shader )
        this.fragment_shader = this.compilarAdjuntarShader( gl.FRAGMENT_SHADER, nombre_archivo_fs, texto_fragment_shader )

        // Asociar los índices de atributos con las correspondientes variables de entrada ("in")
        // del vertex shader (hay que hacerlo antes de enlazar)
        // (esto es necesario para asegurarnos que conocemos el índice de cada atributo específico
        
        ComprErrorGL( gl, `antes de bind de atributos`)
        Assert( Cauce.numero_atributos >= 2, `${nombref} el cauce no gestiona al menos 2 atributos`)
        gl.bindAttribLocation( this.programa, Cauce.indice_atributo.posicion,    "in_posicion_occ" )
        gl.bindAttribLocation( this.programa, Cauce.indice_atributo.coords_text, "in_coords_textura" )
        ComprErrorGL( gl, `después de bind de atributos`)
        
        
        // enlazar programa y ver errores
        gl.linkProgram( this.programa )

        if ( ! gl.getProgramParameter( this.programa, gl.LINK_STATUS) ) 
        {
            const info = gl.getProgramInfoLog( this.programa )
            console.log(`Se han producido errores al ENLAZAR. Mensajes: \n\n${info}`)
                throw new Error(`${nombref} Se han producido errores al ENLAZAR. Mensajes: \n\n${info}`);
        }

        if ( ! gl.isProgram( this.programa ))
        {
            console.log(`Se han producido errores al ENLAZAR.`)
                throw new Error(`${nombref} el programa enlazado no es válido`);
        }
        
        ComprErrorGL( gl, `${nombref} error OpenGL al final`)
        Log(`${nombref} programa compilado y enlazado ok.`)
    }
    // ---------------------------------------------------------------------------

    /**
     * Compilar un shader y, si va bien, adjuntarlo al objeto programa. Si hay errores se lanza 
     * una excepción cuyo texto tiene el log de errores.
     * 
     * @param tipo_shader  uno de: gl.FRAGMENT_SHADER, gl.VERTEX_SHADER, 
     * @param nombre_archivo (string) nombre del archivo que contenía el texto fuente
     * @param texto_fuente texto fuente del shader.
     */
    private compilarAdjuntarShader( tipo_shader : GLenum, nombre_archivo : string, texto_fuente : string ) : WebGLShader 
    {
        const nombref : string = "Cauce.compilarAdjuntarShader:"
        let gl = this.gl 

        // comprobar precondiciones
        ComprErrorGL( gl, `${nombref} error OpenGL al inicio`)
        if ( this.programa == null ) 
            throw Error(`${nombref} no se ha creado objeto programa`)
        Assert( tipo_shader == gl.VERTEX_SHADER || tipo_shader == gl.FRAGMENT_SHADER, 
                 `${nombref} valor de 'tipo_shader' es incorrecto` ) 

        // crear y compilar el shader
        let shader = gl.createShader( tipo_shader )
        if ( shader == null )
                throw Error(`${nombref} no se ha podido crear el objeto shader`)

        gl.shaderSource( shader, texto_fuente )
        gl.compileShader( shader )

        // si ha habido error, lanzar error
        if ( ! gl.getShaderParameter( shader, gl.COMPILE_STATUS) ) 
        {
            const info = gl.getShaderInfoLog( shader )
            console.log(`${nombref} mensajes de error al compilar '${nombre_archivo}' : \n\n${info}`)
            throw new Error(`Se han producido errores al compilar archivo <b>${nombre_archivo}</b> (ver log)`);
        }

        gl.attachShader( this.programa, shader )
        ComprErrorGL( gl, `${nombref} error OpenGL al final`)
        Log(`${nombref} shader en '${nombre_archivo}' compilado ok.`)
        // ya está:
        return shader
    }
    // ---------------------------------------------------------------------------

    /**
     * Activa el objeto programa (hace 'useProgram' )
     * (this.gl debe estar correctamente inicializado)
     */
    public activar() : void
    {
        const nombref : string = "Cauce.activar:"
        let gl = this.gl 
        gl.useProgram( this.programa )
    }
    
    // ---------------------------------------------------------------------------

    /**
     * Fija el valor de 'S'
     * @param nue_param_s (number) 
     */
    public fijarParamS( nue_param_s : number ) : void
    {
        //console.log(`param s == ${nue_param_s}`)
        this.param_s = nue_param_s
        this.gl.uniform1f( this.loc_param_s, this.param_s ) // cambia parámetro del shader
    }
    // ---------------------------------------------------------------------------

    /**
     * Fija el tamaño del framebuffer
     * @param nuevo_num_cols (number) entero con el número de columnas de pixels
     * @param nuevo_num_rows (number) entero con el número de filas de pixels
     */
    public fijarNumColsRows( nuevo_num_cols : number, nuevo_num_rows : number ) : void 
    {
        let ires = new Float32Array([ nuevo_num_cols, nuevo_num_rows ])
        this.gl.uniform2fv( this.loc_iResolution, ires  )
    }
    // ---------------------------------------------------------------------------

    /**
     * Fija los ángulos de longitud y latitud de la cámara
     * @param nuevo_ac_long_grad (number) ángulo de longitud en grados
     * @param nuevo_ac_lat_grad (number) ángulo de latitud en grados
     */
    public fijarAngCamGrad( nuevo_ac_long_grad : number, nuevo_ac_lat_grad : number ) : void 
    {
        this.ac_lat_grad = nuevo_ac_lat_grad
        this.ac_long_grad = nuevo_ac_long_grad 

        this.gl.uniform1f( this.loc_ac_long_grad, this.ac_long_grad )
        this.gl.uniform1f( this.loc_ac_lat_grad, this.ac_lat_grad )
    }
    // ---------------------------------------------------------------------------


    /**
     * Fija la distancia de la cámara
     * @param nuevo_cam_dist  (number) nueva distancia de la cámara
     */
    public fijarCamDist( nuevo_cam_dist : number )
    {
        this.cam_dist = nuevo_cam_dist
        //Log(`Cauce.fijarCamDist: cam_dist = ${this.cam_dist}`)
        this.gl.uniform1f( this.loc_cam_dist, this.cam_dist )
    }
    // ---------------------------------------------------------------------------

    public fijarNaa( nuevo_naa : number ) : void 
    {
        this.naa = Math.max( 1, Math.floor(nuevo_naa) )
        //Log(`Cauce: naa = ${this.naa}`)
        this.gl.uniform1i( this.loc_naa, this.naa )
    }

    // ---------------------------------------------------------------------------

    public fijarSoloPrimarios( nuevo_solo_primarios : boolean ) : void 
    {
        this.solo_primarios = nuevo_solo_primarios
        this.gl.uniform1i( this.loc_solo_primarios, this.solo_primarios ? 1 : 0 )
    }
    // ---------------------------------------------------------------------------


    /**
     * Activa o desactiva el uso de una textura en los shaders (fija uniform)
     * Si se activa, hay que especificar el objeto de textura webgl a usar.
     * 
     * @param nuevo_eval_text 
     * @param texture 
     */
    public fijarEvalText( nuevo_eval_text : boolean, texture: WebGLTexture | null  ) : void 
    {
        const nombref : string = "Cauce.fijarEvalText:"
        let gl = this.gl 

        // registrar nuevo valor
        this.eval_text = nuevo_eval_text
        this.gl.uniform1i( this.loc_eval_text, b2n( this.eval_text ) )

        // si se está activando, asociar el sampler de textura en el shader con el objeto textura de la aplicación
        if ( nuevo_eval_text )
        {
            if ( texture == null )
                throw Error(`${nombref} si se habilita uso de texturas, se debe dar una textura no nula` )
            
            gl.activeTexture( gl.TEXTURE0 )  // ver nota aquí abajo.
            gl.bindTexture( gl.TEXTURE_2D, texture )
            
            // Nota: 'activeTexture' activa la unidad 0 de texturas, que está activada por defecto,  solo sería necesario si hubiese más de una textura en el shader (las demás irían en la unidad 1, la 2, etc...), no es el caso, pero lo pongo por si acaso, ver: https://webglfundamentals.org/webgl/lessons/webgl-2-textures.html (al final)
        }
    }

    // ---------------------------------------------------------------------------



} // fin clase 'Cauce'