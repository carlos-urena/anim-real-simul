

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
        color       : 1, 
        normal      : 2, 
        coords_text : 3
    }

    // número máximo de fuentes de luz que gestiona el cauce 
    // (debe coincidir con el valor de la constante declarada para esto 
    // en el fragment shader, con el mismo nombre)
    public static readonly max_num_luces = 8

    // ---------------------------------------------------------------------------
    // Variables de instancia:

    // objeto programa 
    private programa! : WebGLProgram 

    // contexto WebGL, dado en el constructor 
    private gl! : WebGLRenderingContext | WebGL2RenderingContext 

    // objetos shaders 
    private fragment_shader!  : WebGLShader 
    private vertex_shader!    : WebGLShader  

    // variables de estado del cauce

    private mat_modelado     : Mat4 = CMat4.ident() // matriz de modelado
    private mat_modelado_nor : Mat4 = CMat4.ident() // matriz de modelado para normales
    private mat_vista        : Mat4 = CMat4.ident() // matriz de vista
    private mat_proyeccion   : Mat4 = CMat4.ident() // matriz de proyección

    private eval_mil          : Boolean = false // true -> evaluar MIL, false -> usar color plano
    private usar_normales_tri : Boolean = false // true -> usar normal del triángulo, false -> usar interp. de normales de vértices
    private eval_text         : Boolean = false // true -> eval textura, false -> usar glColor o glColorPointer

    private tipo_gct : number = 0 ;     // tipo de generación de coordenadas de textura
    private color    : Vec3 = new Vec3([0.0, 0.0, 0.0]) // color actual para visualización sin tabla de colores
    private coefs_s  : Float32Array = new Float32Array([1.0,0.0,0.0,0.0])  // coeficientes para calcular coord. S con gen. aut. de coordenadas de textura
    private coefs_t  : Float32Array = new Float32Array([0.0,1.0,0.0,0.0])  // coeficientes para calcular coord. S con gen. aut. de coordenadas de textura

    // pilas de colores y matrices guardadas
    private pila_colores          : Array<Vec3> = new Array<Vec3>
    private pila_mat_modelado     : Array<Mat4> = new Array<Mat4>
    private pila_mat_modelado_nor : Array<Mat4> = new Array<Mat4>

    // locations de los uniforms (cada una de ellas puede ser null)
    private loc_mat_modelado       : WebGLUniformLocation | null = null
    private loc_mat_modelado_nor   : WebGLUniformLocation | null = null
    private loc_mat_vista          : WebGLUniformLocation | null = null
    private loc_mat_proyeccion     : WebGLUniformLocation | null = null
    private loc_eval_mil           : WebGLUniformLocation | null = null
    private loc_usar_normales_tri  : WebGLUniformLocation | null = null
    private loc_eval_text          : WebGLUniformLocation | null = null
    private loc_tipo_gct           : WebGLUniformLocation | null = null
    private loc_coefs_s            : WebGLUniformLocation | null = null
    private loc_coefs_t            : WebGLUniformLocation | null = null
    private loc_mil_ka             : WebGLUniformLocation | null = null
    private loc_mil_kd             : WebGLUniformLocation | null = null
    private loc_mil_ks             : WebGLUniformLocation | null = null
    private loc_mil_exp            : WebGLUniformLocation | null = null
    private loc_num_luces          : WebGLUniformLocation | null = null
    private loc_pos_dir_luz_ec     : WebGLUniformLocation | null = null
    private loc_color_luz          : WebGLUniformLocation | null = null
    private loc_param_s            : WebGLUniformLocation | null = null

    
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
        
        // obtener las 'locations' de los parámetros uniform

        this.loc_mat_modelado      = this.leerLocation( "u_mat_modelado" )
        this.loc_mat_modelado_nor  = this.leerLocation( "u_mat_modelado_nor" )
        this.loc_mat_vista         = this.leerLocation( "u_mat_vista" )
        this.loc_eval_mil          = this.leerLocation( "u_eval_mil" )
        this.loc_mat_proyeccion    = this.leerLocation( "u_mat_proyeccion" )
        this.loc_eval_mil          = this.leerLocation( "u_eval_mil" )
        this.loc_usar_normales_tri = this.leerLocation( "u_usar_normales_tri" )
        this.loc_eval_text         = this.leerLocation( "u_eval_text" )
        this.loc_tipo_gct          = this.leerLocation( "u_tipo_gct" )
        this.loc_coefs_s           = this.leerLocation( "u_coefs_s" )
        this.loc_coefs_t           = this.leerLocation( "u_coefs_t" )
        this.loc_mil_ka            = this.leerLocation( "u_mil_ka" )
        this.loc_mil_kd            = this.leerLocation( "u_mil_kd" )
        this.loc_mil_ks            = this.leerLocation( "u_mil_ks" )
        this.loc_mil_exp           = this.leerLocation( "u_mil_exp" )
        this.loc_num_luces         = this.leerLocation( "u_num_luces" )
        this.loc_pos_dir_luz_ec    = this.leerLocation( "u_pos_dir_luz_ec" )
        this.loc_color_luz         = this.leerLocation( "u_color_luz" )
        this.loc_param_s           = this.leerLocation( "u_param_s" )

        // dar valores iniciales por defecto a los parámetros uniform
        gl.uniformMatrix4fv( this.loc_mat_modelado,     false, this.mat_modelado )
        gl.uniformMatrix4fv( this.loc_mat_modelado_nor, false, this.mat_modelado_nor )
        gl.uniformMatrix4fv( this.loc_mat_vista,        false, this.mat_vista )
        gl.uniformMatrix4fv( this.loc_mat_proyeccion,   false, this.mat_proyeccion) 

        gl.uniform1i( this.loc_eval_mil,          b2n( this.eval_mil ) )
        gl.uniform1i( this.loc_usar_normales_tri, b2n( this.usar_normales_tri ) )
        gl.uniform1i( this.loc_eval_text,         b2n( this.eval_text ) )

        gl.uniform1i( this.loc_tipo_gct, this.tipo_gct )

        gl.uniform4fv( this.loc_coefs_s, this.coefs_s )
        gl.uniform4fv( this.loc_coefs_t, this.coefs_t )  
        
        gl.uniform1f( this.loc_mil_ka,  0.2 )
        gl.uniform1f( this.loc_mil_kd,  0.8 )
        gl.uniform1f( this.loc_mil_ks,  0.0 )
        gl.uniform1f( this.loc_mil_exp, 0.0 )

        gl.uniform1i( this.loc_num_luces, 0 ) // por defecto: 0 fuentes de luz activas
        
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

        const nombre_archivo_vs = "/glsl/cauce_3_00_vertex_shader.glsl"
        const nombre_archivo_fs = "/glsl/cauce_3_00_fragment_shader.glsl"

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
        Assert( Cauce.numero_atributos >= 4, `${nombref} el cauce no gestiona al menos 4 atributos`)
        gl.bindAttribLocation( this.programa, Cauce.indice_atributo.posicion,    "in_posicion_occ" )
        gl.bindAttribLocation( this.programa, Cauce.indice_atributo.color,       "in_color" )
        gl.bindAttribLocation( this.programa, Cauce.indice_atributo.normal,      "in_normal_occ" )
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
            throw new Error(`${nombref} se han producido errores al COMPILAR (ver arriba)`);
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
     */
    public activar() : void
    {
        const nombref : string = "Cauce.activar:"
        let gl = this.gl 
        gl.useProgram( this.programa )
    }
    // ---------------------------------------------------------------------------
    
    /**
     * Fija el color para las siguientes operaciones de visualización de VAOs sin colores
     * @param nuevo_color (Vec3) nuevo color actual 
     */
    public fijarColor( nuevo_color : Vec3 ) : void 
    {
        this.color = nuevo_color
        this.gl.vertexAttrib3fv( Cauce.indice_atributo.color, this.color )
    }
    // ---------------------------------------------------------------------------

    /**
     * Guarda una copia del color actual en la pila de colores
     */
    public pushColor() : void 
    {
        this.pila_colores.push( this.color )
    }
    // ---------------------------------------------------------------------------
    
    /**
     * Restaura último color guardado en la pila de colores
     */
    public popColor() : void 
    {
        const nombref : string = 'Cauce.popColor'
        if ( this.pila_colores.length == 0 )
            throw new Error(`${nombref} intento de hacer pop en la pila de colores vacía`)
        this.fijarColor( this.pila_colores[ this.pila_colores.length-1])
        this.pila_colores.pop()
    }
    // ---------------------------------------------------------------------------
    
    /**
     * Cambia la matriz de vista en el objeto programa
     * @param nueva_mat_vista (Mat4) nueva matriz de vista 
     */
    public fijarMatrizVista( nueva_mat_vista : Mat4 ) : void 
    {
        this.mat_vista = nueva_mat_vista
        this.gl.uniformMatrix4fv( this.loc_mat_vista, true, this.mat_vista )  // SE TRASPONE!!
    }
    // ---------------------------------------------------------------------------

    /**
     * Cambia la matriz de proyeccion en el objeto programa
     * @param nueva_mat_proyeccion (Mat4) nueva matriz de proyección
     */
    public fijarMatrizProyeccion( nueva_mat_proyeccion : Mat4 ) : void 
    {
        this.mat_proyeccion = nueva_mat_proyeccion
        this.gl.uniformMatrix4fv( this.loc_mat_proyeccion, true, this.mat_proyeccion ) // SE TRASPONE !!
    }
    // ---------------------------------------------------------------------------

    /**
     * Cambia la matriz de modelado en el objeto programa
     * @param nueva_mat_modelado (Mat4) nueva matriz de modelado
     */
    public fijarMatrizModelado( nueva_mat_modelado : Mat4 ) : void 
    {
        this.mat_modelado     = nueva_mat_modelado
        this.mat_modelado_nor = nueva_mat_modelado.inversa3x3().traspuesta3x3()
        this.gl.uniformMatrix4fv( this.loc_mat_modelado, true, this.mat_modelado ) // SE TRASPONE !!
        this.gl.uniformMatrix4fv( this.loc_mat_modelado_nor, true, this.mat_modelado_nor ) 
    }
    // ---------------------------------------------------------------------------

    /**
     * Hace la matriz de modelado igual a la identidad
     */
    public resetMM(  ) : void 
    {
        this.fijarMatrizModelado( CMat4.ident() )
    }
    // ---------------------------------------------------------------------------

    /**
     * Compone una matriz 4x4 por la derecha de la matriz de modelado actual.
     * @param mat_modelado_adic 
     */
    public compMM( mat_modelado_adic : Mat4 ) : void 
    {
        const mat_modelado_nueva = this.mat_modelado.componer( mat_modelado_adic )
        this.fijarMatrizModelado( mat_modelado_nueva )
    }
    // ---------------------------------------------------------------------------

    /**
     * Guarda una copia de la matriz de modelado actual en la pila, no la cambia.
     */
    public pushMM() : void 
    {
        this.pila_mat_modelado.push( this.mat_modelado )
    }

    // ---------------------------------------------------------------------------

    /**
     * Restaura la última matriz de modelado que hubiese en la pila.
     * produce un error si la pila está vacía
     */
    public popMM() : void 
    {
        const n = this.pila_mat_modelado.length 
        Assert( n > 0 , `No se puede hacer 'popMM' en una pila vacía` )
        const prev_mat = this.pila_mat_modelado[ n-1 ]
        this.pila_mat_modelado.pop()
        this.fijarMatrizModelado( prev_mat )
    }

    // ---------------------------------------------------------------------------

    /**
     * Activa o desactiva la evaluación del modelo de iluminación local
     * @param nue_eval_mil (boolean) true para activar iluminacion, false para desactivar 
     */
    public fijarEvalMIL( nue_eval_mil : boolean ) : void
    {
        this.eval_mil = nue_eval_mil  // registra valor en el objeto Cauce.
        this.gl.uniform1i( this.loc_eval_mil, b2n( this.eval_mil ) ) // cambia parámetro del shader
    }

    // ---------------------------------------------------------------------------

    /**
     * Fija el valor de 'S'
     * @param nue_param_s (number) 
     */
    public fijarParamS( nue_param_s : number ) : void
    {
        
        this.gl.uniform1f( this.loc_param_s, nue_param_s ) // cambia parámetro del shader
    }
    // ---------------------------------------------------------------------------

    /**
     * Fijar los parámetros del modelo de iluminación local (MIL)
     * @param ka (number)
     * @param kd (number)
     * @param ks (number)
     * @param exp  (number)
     */
    public fijarParamsMIL( ka : number, kd : number, ks : number, exp : number )  
    {
        this.gl.uniform1f( this.loc_mil_ka,   ka );
        this.gl.uniform1f( this.loc_mil_kd,   kd );
        this.gl.uniform1f( this.loc_mil_ks,   ks );
        this.gl.uniform1f( this.loc_mil_exp,  exp );
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
    
    /**
     * da valores a los uniforms relacionados con las fuentes de luz en el cauce 
     * 
     * @param color      vector de colores de las fuentes de luz
     * @param pos_dir_wc vector de posiciones o direcciones a la fuentes de luz (en coordenadas de mundo)
     */
    public fijarFuentesLuz( color : Vec3[], pos_dir_wc : Vec4[] ) : void
    {
        const nombref : string = `Cauce.fijarFuentesLuz:`
        const nl : number = color.length
       
        Assert( 0 < nl && nl < Cauce.max_num_luces, `${nombref} demasiadas fuentes de luz` )
        Assert( nl == pos_dir_wc.length, `${nombref} el vector de colores y el de posiciones/direcciones tienen distinto tamaño` );

        let gl = this.gl

        let pos_dir_ec : Vec4[] = [] 

        for( let i = 0 ; i < nl ; i++ )
            pos_dir_ec.push( this.mat_vista.aplica_v4( pos_dir_wc[i] ) )

        gl.uniform1i( this.loc_num_luces, nl )
        gl.uniform3fv( this.loc_color_luz, CrearFloat32ArrayV3( color ) )
        gl.uniform4fv( this.loc_pos_dir_luz_ec, CrearFloat32ArrayV4( pos_dir_ec ) )
    }
    //


} // fin clase 'Cauce'