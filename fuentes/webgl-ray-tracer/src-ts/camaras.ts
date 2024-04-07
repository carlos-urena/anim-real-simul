

import { Assert, ComprErrorGL, Log } from "./utilidades.js"
import { Vec2, Vec3, Vec4, Mat4, CMat4 } from "./vec-mat.js"
import { Cauce } from "./cauce.js"

// -------------------------------------------------------------------------------------------------
// 

/**
 * Dimensiones del viewport (no hace falta!)
 */
export class Viewport 
{
    private ancho : number = 0 
    private alto  : number = 0 
    private ratio_yx : number = 0.0  

    /**
     * Construye un objeto 'viewport' dando sus dimensiones
     * 
     * @param ancho_inicial (number) número de columnas de pixel del viewport (>0)
     * @param alto_inicial  (number) número de filas de pixel del viewport (>0)
     */
    constructor( ancho_inicial : number, alto_inicial : number )
    {
        this.fijarDimensiones( ancho_inicial, alto_inicial )
    }
    // -----------------------------------------------------------------------------
    
    /**
     * Cambia las dimensiones del viewport
     * @param nuevo_ancho (number) nuevo número de columnas de pixel del viewport (>0)
     * @param nuevo_alto  (number) nuevo número de filas de pixel del viewport (>0)
     */
    fijarDimensiones( nuevo_ancho : number, nuevo_alto : number ) : void
    {
        const nombref : string = 'Viewport.setDimensions()'
        
        Assert( 0 < nuevo_ancho && 0 < nuevo_alto, `${nombref} el ancho o alto del viewport no pueden ser negativos (las dimensiones son ${nuevo_ancho} x ${nuevo_alto})`)

        this.ancho    = nuevo_ancho
        this.alto     = nuevo_alto
        this.ratio_yx = this.alto / this.ancho 
    }
    // -----------------------------------------------------------------------------

    /**
     * Devuelve el aspect ratio Y/X de este viewport
     * @returns alto dividido por el ancho 
     */
    leerRatioYX() : number 
    {
        return this.ratio_yx
    }
}
// ***************************************************************************************


/**
 * Clase que encapsula una matriz de proyección y una matriz de vista,
 * junto con las operaciones para rotarla con dos grados de libertad)
 */
export class CamaraOrbital
{
    // nombre de la cámara
    private nombre     : string   = "(cámara con nombre no asignado)"

    // viewport de la cámara (se usa para saber sus proporciones)
    private viewport   : Viewport = new Viewport( 256, 256 )

    // matriz de vista
    private matriz_vista  : Mat4 = CMat4.ident() 

    // matriz de proyección
    private matriz_proyeccion : Mat4 = CMat4.ident()

    // amplitud de campo vertical (en grados) para cámaras perspectivas
    private fovy_grad : number = 60.0

    // distancia al plano de recorte delantero 
    private near : number = 0.05 

    // distancia al plano de recorte trasero 
    private far : number = 30.05 

    // true si la cámara es perspectiva, false si es paralela (por ahora solo puede ser true)
    private es_perspectiva : boolean = true 

    // punto de atención actual
    private punto_atencion : Vec3 = new Vec3([ 0.0, 0.0, 0.0 ])

    // ángulo vertical de la cámara en grados (rotación entorno a X)
    private angulo_vert_grad : number = 45.0 

    // ángulo horizontal de la cámara en grados (rotación entorno a Y)
    private angulo_hor_grad : number = 45.0

    // distancia desde el observador hasta el punto de atención 
    private distancia : number = 3.0
    

    /**
     * Construye una cámara nueva, por defecto es una cámara perspectiva
     * @param nombre 
     */
    constructor( nombre : string )
    {
        this.nombre = nombre
    }

    /**
     * fijar las dimensiones del viewport en el que se usará esta cámara
     * @param {Viewport} nuevo_viewport 
     */
    fijarViewport( nuevo_viewport : Viewport  ) : void
    {
        this.viewport = nuevo_viewport
    }
    /**
     * Actualiza la matriz de proyección a partir del aspect ratio del viewport,
     * de la amplitud de campo y de los valores 'near' y 'far' actuales.
     */
    actualizarMatrizProyeccion() : void 
    {
        const nombref : string = "Camara.actualizarMatrizProyeccion"
        Assert( this.es_perspectiva, `${nombref} todavía no gestiono cámaras paralelas, sorry...` )

        this.matriz_proyeccion = CMat4.perspective( this.fovy_grad, 1.0/this.viewport.leerRatioYX(),
                                                    this.near, this.far )
        //Log(`${nombref} proyy == ${this.matriz_proyeccion}`)
    }

    /**
     * Actualiza la matriz de vista, a partir del punto de atención, los ángulos 
     * vertical y horizontal, y la distancia observador-punto de atención
     */
    actualizarMatrizVista() : void 
    {
        const nombref : string = "Camara.actualizarMatrizProyeccion"
        const 
            a      : Vec3 = this.punto_atencion,
            mtras1 : Mat4 = CMat4.traslacion( new Vec3([ -a.x, -a.y, -a.z ])),
            mrot2  : Mat4 = CMat4.rotacionXgrad( this.angulo_vert_grad ),
            mrot1  : Mat4 = CMat4.rotacionYgrad( -this.angulo_hor_grad ),
            mtras2 : Mat4 = CMat4.traslacion( new Vec3([ 0, 0, -this.distancia ]))

        this.matriz_vista = mtras2.componer( mrot2.componer( mrot1.componer( mtras1 ) ) )
        //Log(`${nombref} matriz de vista  == ${this.matriz_vista}`)        
    }

    /**
     * Activar esta cámara en un cauce.
     * actualiza las matrices de vista y proyeccion, y las pasa al cauce.
     * Hace 'reset' (reinicializa) de la matriz de modelado en el cauce.
     * @param cauce (Cauce) cauce en el que se activa la matriz
     */
    activar( cauce : Cauce ) : void
    {
        const nombref : string = 'Camera.activar:'

        //Log(`${nombref} activación de cámara: '${this.nombre}'`)

        this.actualizarMatrizProyeccion()
        this.actualizarMatrizVista()

        cauce.fijarMatrizVista( this.matriz_vista )
        cauce.fijarMatrizProyeccion( this.matriz_proyeccion )
        cauce.resetMM()
    }
    /**
     * Modifica los ángulos horizonal y vertical de la cámara orbital 
     * 
     * @param incr_hor (number) -- incremento en horizontal 
     * @param incr_ver (number) -- incremento en vertical 
     */
    moverHV( incr_horiz : number, incr_vert : number ) : void
    {
        const nombref : string = 'CamaraOrbital.moverHV'

        this.angulo_hor_grad  += incr_horiz
        this.angulo_vert_grad += incr_vert
    }

    /**
     * Modifica la distancia entre el punto de atención y el punto del observador
     * @param incr_z (number) +1 o -1 según la dirección de movimiento del ratón
     */
    moverZ( incr_z : number ) : void
    {
        const nombref = 'CamaraOrbital.moverZ'
        //Log(`${nombref} incr_z == ${incr_z}, dist = ${this.distancia}`)
        const incr_en_porcentaje : number = 3.0*incr_z
        this.distancia = this.distancia * (1.0 + incr_en_porcentaje/100.0)
    }


}  // fin class CamaraOrbital

