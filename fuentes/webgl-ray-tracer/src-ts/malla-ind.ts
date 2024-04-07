
import  { Log, ComprErrorGL, Assert, 
          CrearFloat32ArrayV3, CrearFloat32ArrayV2, 
          CrearUint32Array 
        } 
        from "./utilidades.js"

import  { Cauce, CrearCauce 
        } 
        from "./cauce.js"

import  { DescrVAO, 
          DescrVBOAtrib, DescrVBOInd 
        } 
        from "./vaos-vbos.js"


import  { Vec2, Vec3, Vec4, UVec3, 
          Mat4, CMat4 
        } 
        from "./vec-mat.js"

import  { ObjetoVisualizable 
        } 
        from "./objeto-visu.js"

import { Textura } from  "./texturas.js"
import { AplicacionPCG } from "./aplicacion-pcg.js"



// **********************************************************************************

/**
 * Clase para mallas indexadas de triángulos
 */
export class MallaInd extends ObjetoVisualizable
{
    // tablas de atributos
    protected posiciones  : Vec3[] = []  // tabla de coordenadas de las posiciones de los vértices
    protected colores     : Vec3[] = []  // tabla de colores de los vértices 
    protected normales_v  : Vec3[] = []  // tabla de normales de los vértices 
    protected coords_text : Vec2[] = []  // tabla de coordenadas de textura de los vértices

    // tabla de triángulos (tabla de índices)
    protected triangulos : UVec3[] = [] 

    // contexto
    //protected gl : WebGL2RenderingContext | WebGLRenderingContext

    // descriptor del VAO con la malla
    protected dvao : DescrVAO | null = null
    
    // descriptor del VAO con las aristas (se crea al llamar a 'crearVAOAristas')
    protected dvao_aristas : DescrVAO | null = null 

    // descriptor del VAO con los segmentos de normales (se crea al llamar a 'crearVAONormales')
    protected dvao_normales : DescrVAO | null = null 

    
    // --------------------------------------------------------------------

    /**
     * Construye una malla indexada 
     */
    public constructor(  )
    {
        super()
        this.fijarNombre = 'malla indexada'
    }

    // --------------------------------------------------------------------

    /**
     * Comprueba que una malla indexada está correctamente inicializada 
     * (se debe llamar al final del constructor de las clases derivadas)
     * se llama antes de visualizar la primera vez.
     */
    protected comprobar( nombref : string ) : void 
    {
        Assert( this.posiciones.length > 0, `${nombref} malla indexada con tabla de posiciones de vertices vacía (${this.leerNombre})` )
        Assert( this.triangulos.length > 0, `${nombref} malla indexada con tabla de triángulos vacía (${this.leerNombre})` )

        if ( this.colores.length > 0 )
            Assert( this.posiciones.length == this.colores.length, `${nombref} tabla de colores no vacía pero con tamaño distinto a la de vértices (${this.leerNombre})` )
        if ( this.normales_v.length > 0 )
            Assert( this.posiciones.length == this.normales_v.length, `${nombref} tabla de normales no vacía pero con tamaño distinto a la de vértices (${this.leerNombre})` )
        if ( this.coords_text.length > 0 )
            Assert( this.posiciones.length == this.coords_text.length, `${nombref} tabla de coordenadas de textura no vacía pero con tamaño distinto a la de vértices (${this.leerNombre})` )
                   
    }
    // --------------------------------------------------------------------

    /**
     * Crea e inicializa el VAO
     */
    private crearInicializarVAO() : void
    {
        const nombref : string = 'MallaInd.crearVAO'
        let gl = AplicacionPCG.instancia.gl

        //Log(`${nombref} inicio, creando VAO de ${this.leerNombre}`)

        Assert( this.dvao == null, `${nombref} el vao ya está creado`)  
        this.comprobar( nombref )

        this.dvao = new DescrVAO({ posiciones : this.posiciones, indices: this.triangulos }) 

        if ( this.colores.length > 0 )
            this.dvao.agregar_tabla_atrib_v3( Cauce.indice_atributo.color, this.colores ) 
        
        if ( this.normales_v.length > 0 )
            this.dvao.agregar_tabla_atrib_v3( Cauce.indice_atributo.normal, this.normales_v ) 

        if ( this.coords_text.length > 0 )
            this.dvao.agregar_tabla_atrib_v2( Cauce.indice_atributo.coords_text, this.coords_text ) 

        this.dvao.nombre = `VAO de la malla indexada '${this.leerNombre}'`
        
        //Log(`${nombref} fin`)
    }
    // --------------------------------------------------------------------


    private crearVAOAristas() : void
    {
        const nombref : string = `MallaInd.crearTablaAristas (${this.leerNombre}):`

        let gl = AplicacionPCG.instancia.gl

        const nv : number = this.posiciones.length

        Assert( nv > 0 , `${nombref} no hay vértices en la malla`)
        Assert( this.triangulos.length > 0, `${nombref} la tabla de triángulos está vacía`)
        Assert( this.dvao_aristas == null , `${nombref} ya se ha creado el VAO de aristas` )

        Log(`${nombref} inicio, nv == ${nv}`)

        // Declarar en inicializar la tabla de adyacencias 'adyacentes'
        // para cada vértice 'i', tiene el conjunto de índices de vértices 
        // 'j' con i<j tal que hay una arista entre 'i' y 'j'
        let adyacentes = new Array<Set<number>>(nv)
        for( let i = 0 ; i < nv ; i++ )
            adyacentes[i] = new Set<number>

        // función que añade una arista a la tabla de adyacencias
        function arista( a : number, b : number ) 
        { 
            Assert( 0 <= a && a < nv, `${nombref} índice de vértice 'a' fuera de rango`)
            Assert( 0 <= b && b < nv, `${nombref} índice de vértice 'b' fuera de rango`)
            adyacentes[ Math.min(a,b) ].add( Math.max(a,b) ) 
        }
    
        // crear la tabla de adyacencias usando la tabla de triángulos 
        for( let t of this.triangulos )
        {
            arista( t[0], t[1] )
            arista( t[1], t[2] )
            arista( t[2], t[0] )
        }

        // contar cuantas aristas hay en total, sumando la cardinalidad de los conjuntos en 
        // la tabla de adyacencias
        let na : number = 0
        for( let s of adyacentes )
            na = na + s.size

        Log(`${nombref} el número de aristas en ${this.leerNombre} es ${na}`)

        // crear la tabla de aristas a partir de la tabla de adyacentes
        let aristas = new Uint32Array( 2*na )
        let ca : number = 0

        for( let i = 0 ; i < adyacentes.length ; i++ )
            for( let j of adyacentes[i] )
            {
                aristas[ca++] = i
                aristas[ca++] = j 
            }

        Assert( ca == 2*na, `${nombref} esto no debe saltar, na == ${na}, ca == ${ca}`)

        // crear el descriptor de VAO
        this.dvao_aristas = new DescrVAO({ posiciones: this.posiciones, indices:aristas })
        
        Log(`${nombref} creado el VAO de aristas de ${this.leerNombre}`)
    }
    // --------------------------------------------------------------------

    /**
     * Crea el VAO de normales (this.dvao_normales)
     */
    public crearVAONormales( ) : void 
    {
        const nombref : string = `MallaInd.crearVAONormales`
        Assert( this.dvao_normales == null, `${nombref} el VAO de normales ya está creado` )
        Assert( this.normales_v.length == this.posiciones.length, `${nombref} no hay normales, o no las mismas que vértices.`)

        let segmentos : Vec3[] = new Array<Vec3>( 2*this.normales_v.length )

        for( let i = 0 ; i < this.posiciones.length ; i++ )
        {  
            segmentos[ 2*i+0 ] = this.posiciones[i] 
            segmentos[ 2*i+1 ] = this.posiciones[i].mas( this.normales_v[i].mult( 0.35 ))
        }
        this.dvao_normales = new DescrVAO({ posiciones: segmentos })
    }
   
    // --------------------------------------------------------------------

    /**
     * Crea e inicializar el VAO (si no lo estaba) y visualizar la malla
     */
    public visualizar(  ) : void 
    {
        const nombref : string = `MallaInd.visualizarGL (${this.leerNombre}):`
        let gl = AplicacionPCG.instancia.gl
        let cauce = AplicacionPCG.instancia.cauce 

        if ( this.tieneColor )
        {
            cauce.pushColor()
            cauce.fijarColor( this.leerColor )
        }

        if ( this.dvao == null ) 
            this.crearInicializarVAO() 

        this.dvao!.draw( gl.TRIANGLES )

        if ( this.tieneColor )
            cauce.popColor()
    }
    // --------------------------------------------------------------------

    /**
     * Visualiza las aristas de un objeto, la 1a vez crea 'dvao_aristas'
     */
    public visualizarAristas( ) : void 
    {
        const nombref : string = `MallaInd.visualizarGL_Aristas (${this.leerNombre}):`
        let gl = AplicacionPCG.instancia.gl 

        if ( this.dvao_aristas == null ) 
            this.crearVAOAristas() 

        this.dvao_aristas!.draw( gl.LINES )
    }
    // --------------------------------------------------------------------

    /**
     * Visualiza las aristas de un objeto, la 1a vez crea 'dvao_aristas'
     */
    public visualizarNormales( ) : void 
    {
        const nombref : string = `MallaInd.visualizarGL_Normales (${this.leerNombre}):`
        let gl = AplicacionPCG.instancia.gl

        if ( this.dvao_normales == null ) 
            this.crearVAONormales() 

        this.dvao_normales!.draw( gl.LINES )
    }

    // --------------------------------------------------------------------
    /**
     * Calcular la tabla de normales de triángulos y vértices.
     * 
     */
    protected calcularNormales( ) : void 
    {
        const nombref : string = `MallaInd.calcularNormalesVertices (${this.leerNombre}):`
        const num_t   : number = this.triangulos.length
        const num_v   : number = this.posiciones.length

        Assert( num_t > 0, `${nombref} no hay triángulos en la malla`)
        Assert( num_v > 0, `${nombref} no hay vértices en la malla`)

        // calcular las normales de las caras 
        const v       : Vec3[] = this.posiciones
        const ejeY    : Vec3   = new Vec3([ 0.0, 1.0, 0.0 ])
        let   num_td  : number = 0 // cuenta de triángulos degenerados (sin área, y por tanto sin normal)
        let   num_vd  : number = 0 // cuenta de vértices degenerados (= sin normal)
        let   nt      : Vec3[] = Array<Vec3>( num_t ) // normales de triángulos
        const vcero   : Vec3   = new Vec3([ 0.0, 0.0, 0.0 ])
        const eps     : number = 1e-6  // longitud mínima de las normales para ser normalizadas.

        for( let i = 0 ; i < num_t ; i++  )
        {
            const t     : UVec3  = this.triangulos[i]
            const edge1 : Vec3   = v[t[1]].menos( v[t[0]] )
            const edge2 : Vec3   = v[t[2]].menos( v[t[0]] )
            const nn    : Vec3   = edge1.cross( edge2 )  // normal, no normalizada 
            const l     : number = nn.longitud

            if  ( eps < l ) 
                nt[i] = nn.div( l )
            else 
            {   nt[i] = vcero
                num_td ++ 
            }
        }
        Log(`${nombref} calculadas normales de triángulos (${num_td}/${num_t} triángulos degenerados)`)
        
        // calcular las normales de los vértices 
        let nv : Vec3[] = new Array<Vec3>(num_v)
    
        nv.fill( vcero )
    
        for( let it = 0 ; it < num_t ; it++ )
        {
            const t : UVec3 = this.triangulos[it]  
            for( let ivt = 0 ; ivt < 3 ; ivt++ )
                nv[t[ivt]] = nv[t[ivt]].mas( nt[it] )
        }
        for( let iv = 0 ; iv < num_v ; iv++ )
        {
            const l : number = nv[iv].longitud

            if  ( eps < l ) 
                nv[iv] = nv[iv].div( l )
            else 
            {   nv[iv] = vcero
                num_vd ++ 
            }
        }
        Log(`${nombref} calculadas normales de vértices (${num_vd}/${num_v} vértices sin normal)`)

        this.normales_v = nv 
    } 

} // fin de la clase MallaInd




// **********************************************************************************



export class Cubo24 extends MallaInd 
{

    constructor(  )
    {
        super()
        this.fijarNombre = "Cubo 24"
        this.fijarColor  = new Vec3([ 0.6, 1.0, 1.0 ])

        this.posiciones =
        [
            // Cara X-
            new Vec3([ -1.0, -1.0, -1.0 ]),  // 0
            new Vec3([ -1.0, -1.0, +1.0 ]),  // 1
            new Vec3([ -1.0, +1.0, -1.0 ]),  // 2
            new Vec3([ -1.0, +1.0, +1.0 ]),  // 3

            // Cara X+
            new Vec3([ +1.0, -1.0, -1.0 ]),  // 4
            new Vec3([ +1.0, -1.0, +1.0 ]),  // 5
            new Vec3([ +1.0, +1.0, -1.0 ]),  // 6
            new Vec3([ +1.0, +1.0, +1.0 ]),  // 7

            // Cara Y-
            new Vec3([ -1.0, -1.0, -1.0 ]),  // 8
            new Vec3([ -1.0, -1.0, +1.0 ]),  // 9
            new Vec3([ +1.0, -1.0, -1.0 ]),  // 10
            new Vec3([ +1.0, -1.0, +1.0 ]),  // 11

            // Cara Y+
            new Vec3([ -1.0, +1.0, -1.0 ]),  // 12
            new Vec3([ -1.0, +1.0, +1.0 ]),  // 13
            new Vec3([ +1.0, +1.0, -1.0 ]),  // 14
            new Vec3([ +1.0, +1.0, +1.0 ]),  // 15


            // Cara Z-
            new Vec3([ -1.0, -1.0, -1.0 ]),  // 16
            new Vec3([ -1.0, +1.0, -1.0 ]),  // 17
            new Vec3([ +1.0, -1.0, -1.0 ]),  // 18
            new Vec3([ +1.0, +1.0, -1.0 ]),  // 19

            // Cara Z+
            new Vec3([ -1.0, -1.0, +1.0 ]),  // 20
            new Vec3([ -1.0, +1.0, +1.0 ]),  // 21
            new Vec3([ +1.0, -1.0, +1.0 ]),  // 22
            new Vec3([ +1.0, +1.0, +1.0 ])  // 23
        ] 

        this.colores =
        [
            // Cara X-
            new Vec3([ -0.0, -0.0, -0.0 ]),  // 0
            new Vec3([ -0.0, -0.0, +1.0 ]),  // 1
            new Vec3([ -0.0, +1.0, -1.0 ]),  // 2
            new Vec3([ -0.0, +1.0, +1.0 ]),  // 3

            // Cara X+
            new Vec3([ +1.0, -0.0, -0.0 ]),  // 4
            new Vec3([ +1.0, -0.0, +1.0 ]),  // 5
            new Vec3([ +1.0, +1.0, -1.0 ]),  // 6
            new Vec3([ +1.0, +1.0, +1.0 ]),  // 7

            // Cara Y-
            new Vec3([ -0.0, -0.0, -0.0 ]),  // 8
            new Vec3([ -0.0, -0.0, +1.0 ]),  // 9
            new Vec3([ +1.0, -0.0, -0.0 ]),  // 10
            new Vec3([ +1.0, -0.0, +1.0 ]),  // 11

            // Cara Y+
            new Vec3([ -0.0, +1.0, -0.0 ]),  // 12
            new Vec3([ -0.0, +1.0, +1.0 ]),  // 13
            new Vec3([ +1.0, +1.0, -0.0 ]),  // 14
            new Vec3([ +1.0, +1.0, +1.0 ]),  // 15


            // Cara Z-
            new Vec3([ -0.0, -0.0, -0.0 ]),  // 16
            new Vec3([ -0.0, +1.0, -0.0 ]),  // 17
            new Vec3([ +1.0, -0.0, -0.0 ]),  // 18
            new Vec3([ +1.0, +1.0, -0.0 ]),  // 19

            // Cara Z+
            new Vec3([ -0.0, -0.0, +1.0 ]),  // 20
            new Vec3([ -0.0, +1.0, +1.0 ]),  // 21
            new Vec3([ +1.0, -0.0, +1.0 ]),  // 22
            new Vec3([ +1.0, +1.0, +1.0 ])  // 23
        ] 

        this.triangulos =
        [
            // Cara X-
            new UVec3([ 1, 3, 2 ]),
            new UVec3([ 0, 1, 2 ]),

            // Cara X+
            new UVec3([ 4, 6, 5 ]),
            new UVec3([ 5, 6, 7 ]),

            // Cara Y-
            new UVec3([ 8, 10,  9 ]),
            new UVec3([ 9, 10, 11 ]),

            // Cara Y+
            new UVec3([ 13, 15, 14 ]),
            new UVec3([ 12, 13, 14 ]),

            // Cara Z-
            new UVec3([ 17, 19, 18 ]),
            new UVec3([ 16, 17, 18 ]),

            // Cara Z+
            new UVec3([ 20, 22, 21 ]),
            new UVec3([ 21, 22, 23 ])

        ]

        this.coords_text =
        [
            // Cara X- (1)
            new Vec2([ 0.0, 1.0 ]),
            new Vec2([ 1.0, 1.0 ]),
            new Vec2([ 0.0, 0.0 ]),
            new Vec2([ 1.0, 0.0 ]),

            // Cara X+ (6)
            new Vec2([ 1.0, 1.0 ]),
            new Vec2([ 0.0, 1.0 ]),
            new Vec2([ 1.0, 0.0 ]),
            new Vec2([ 0.0, 0.0 ]),

            // Cara Y- (2)
            new Vec2([ 0.0, 1.0 ]),
            new Vec2([ 0.0, 0.0 ]),
            new Vec2([ 1.0, 1.0 ]),
            new Vec2([ 1.0, 0.0 ]),

            // Cara Y+ (5)
            new Vec2([ 0.0, 0.0 ]),
            new Vec2([ 0.0, 1.0 ]),
            new Vec2([ 1.0, 0.0 ]),
            new Vec2([ 1.0, 1.0 ]),

            // Cara Z- (3)
            new Vec2([ 1.0, 1.0 ]),
            new Vec2([ 1.0, 0.0 ]),
            new Vec2([ 0.0, 1.0 ]),
            new Vec2([ 0.0, 0.0 ]),

            // Cara Z+  (4)
            new Vec2([ 0.0, 1.0 ]),
            new Vec2([ 0.0, 0.0 ]),
            new Vec2([ 1.0, 1.0 ]),
            new Vec2([ 1.0, 0.0 ])
        ] 
         
        this.calcularNormales()
        this.comprobar("Cubo24.constructor")
    }
}

// --------------------------------------------------------------------

/**
 * Cuadrado en [0..1] con una textura (la textura ya debe estar creada)
 */
export class CuadradoXYTextura extends MallaInd 
{

    // textura 
    private textura : Textura
    
    /**
     * Crea una malla indexada con un cuadrado con coordenadas de textura,
     * se extiende en X y en Y
     * 
     * @param gl 
     * @param textura (Textura)
     */
    constructor( textura : Textura  )
    {
        super()
        this.fijarNombre = "Cuadro textura"
        this.fijarColor  = new Vec3([ 0.6, 1.0, 1.0 ])
        this.textura     = textura

        this.posiciones =
        [
            new Vec3([ -1.0, -1.0,  0.0 ]),  // 0
            new Vec3([ +1.0, -1.0,  0.0 ]),  // 1
            new Vec3([ +1.0, +1.0,  0.0 ]),  // 2
            new Vec3([ -1.0, +1.0,  0.0 ]),  // 3
        ]

        this.coords_text =
        [
            new Vec2([  0.0,  1.0  ]),  // 0
            new Vec2([  1.0,  1.0  ]),  // 1
            new Vec2([  1.0,  0.0  ]),  // 2
            new Vec2([  0.0,  0.0  ]),  // 3
        ]

        this.triangulos =
        [
            new UVec3([ 0, 1, 2 ]),
            new UVec3([ 0, 2, 3 ])
        ]
        this.calcularNormales()
        this.comprobar("CuadradoXYCCT.constructor")
    }


    public visualizar(  ): void 
    {
        Textura.push()
            this.textura.activar(  )
            super.visualizar(  )
        Textura.pop()
    }
}