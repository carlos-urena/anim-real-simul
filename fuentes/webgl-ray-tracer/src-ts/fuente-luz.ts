import { Assert, Log } from "./utilidades.js"
import { Vec3, Vec4 } from "./vec-mat.js"
import { AplicacionPCG } from "./aplicacion-pcg.js"
import { Cauce } from "./cauce.js"


/**
 * Clase para una fuente de luz, incluye su color y su posición/dirección
 * (las fuentes de luz no se activan de forma individual, sino como parte de una colección)
 */
export class FuenteLuz 
{
    //ublic indice     : number // índice de la fuente en la colección de fuentes o array de fuentes de los shaders
    public pos_dir_wc : Vec4   // posicion o dirección de la fuente en coordenadas de mundo
    public color      : Vec3   // color o intensidad (r,g,b >0 , pero no necesariamente acotado por arriba)

    /**
     * Construye una fuente de luz 
     * @param pos_dir (Vec4) posicion (punto) o dirección (vector) de la fuente ('w' debe ser 0 para direcciones o 1 para posiciones)
     * @param color   color o intensidad de la fuente
     */
    constructor( pos_dir_wc : Vec4, color : Vec3 )
    {
        const nombref : string = 'FuenteLuz.constructor:'
        //Assert( 0 <= indice, `${nombref} índice fuera de rango` )
        Assert( pos_dir_wc.w == 0.0 || pos_dir_wc.w == 1.0, `${nombref} 'pos_dir_wc' debe tener 'w' puesta a 1 o a 0` )
        Assert( pos_dir_wc.longitud + pos_dir_wc.w > 0.0, `${nombref} 'pos_dir_wc' no puede tener todas las componentes a cero` )
        
        //this.indice     = indice
        this.pos_dir_wc = pos_dir_wc
        this.color      = color
    }

}
// ---------------------------------------------------------------------------------------------------------------

/**
 * Clase para una colección de fuentes de luz (es un array de fuentes de luz)
 */
export class ColeccionFuentesLuz extends Array<FuenteLuz>
{
    constructor( arr_fuentes : FuenteLuz[] )
    {
        super( )
        for( let fuente of  arr_fuentes )
            this.push( fuente )
    }
    /**
     * Activa la colección de fuentes de luz en el cauce actual de la aplicación
     */
    public activar() : void 
    {
        const nombref : string = 'ColeccionFuentes.activar'
        Assert( this.length > 0, `${nombref} no se puede activar una colección de fuentes que está vacía`)

        let pos_dir_wc : Vec4[] = []
        let color      : Vec3[] = []

        for( let fuente of this )
        {
            pos_dir_wc.push( fuente.pos_dir_wc )
            color.push( fuente.color )
        }

        let cauce : Cauce = AplicacionPCG.instancia.cauce
        cauce.fijarEvalMIL( true )
        cauce.fijarFuentesLuz( color, pos_dir_wc )
    }
    public desactivar()
    {
        let cauce : Cauce = AplicacionPCG.instancia.cauce
        cauce.fijarEvalMIL( false )
    }
}
