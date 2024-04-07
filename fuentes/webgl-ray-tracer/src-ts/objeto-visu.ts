
import { Log } from "./utilidades.js"
import { Vec3 } from "./vec-mat.js"
import { Cauce } from "./cauce.js"

export class ObjetoVisualizable
{
    private nombre      : string = "no asignado" // nombre del objeto
    private color       : Vec3 | null = null // color del objeto, null si no tiene

    public get leerNombre() : string
    {
        return this.nombre 
    }
    public set fijarNombre( nuevo_nombre : string ) 
    {
        this.nombre = nuevo_nombre
    }
    public get tieneColor() : Boolean
    {
        return this.color != null
    }
    public get leerColor() : Vec3
    {
        if ( this.color == null )
            throw new Error(`intento de leer el color de un ObjetoVisualizable que no lo tiene (${this.nombre})`)
        return this.color
    }
    public set fijarColor( nuevo_color : Vec3 | null ) 
    {
        this.color = nuevo_color
    }

    /**
     * Visualiza el objeto. este método debe ser redefinido en clases derivadas
     */
    public visualizar() : void
    {
        throw new Error(`El objeto '${this.leerNombre}' no tiene redefinido el método 'visualizarGL'`)
    }

    /**
     * Visualiza las aristas del objeto. Este método puede ser redefinido en clases derivadas, si 
     * no se hace, el método no hace nada (eso implica que ese objeto no tiene aristas que se pueden visualizar 
     * o que no se ha implementado esto)
     */
    public visualizarAristas() : void  
    {
        Log(`El objeto '${this.leerNombre}' no tiene método para visualizar aristas ('visualizarAristas')`)
    }

    /**
     * Visualiza las normales del objeto. Este método puede ser redefinido en clases derivadas, si 
     * no se hace, el método no hace nada (eso implica que ese objeto no tiene normales que se pueden visualizar 
     * o que no se ha implementado esto)
     */
    public visualizarNormales() 
    {
        Log(`El objeto '${this.leerNombre}' no tiene método para visualizar normales ('visualizarNormales').`)
    }
}