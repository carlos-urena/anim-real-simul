import { Assert } from "./utilidades.js"
import { Vec2, Vec3, UVec3 } from "./vec-mat.js"
import { MallaInd } from "./malla-ind.js"
import { AplicacionWRT } from "./aplicacion-wrt.js"

/**
 * Función de parametrización para una superficie paramétrica en 3D
 */
export class FuncionParam
{
   private nombre_func : string = "no asignado"
   
   public set nombre( nombre : string ) { this.nombre_func = nombre }
   public get nombre( ) : string        { return this.nombre_func }

   public evaluarPosicion( st : Vec2 ) : Vec3
   {
      throw new Error(`FuncionParam.evaluarPosicion: se ha invocado el método 'evaluarPosicion' pero el objeto no lo tiene redefindo `)
   }

}

/**
 * Un cuadrado perpendicular a Z (en el plano XY), con centro en el origen y lado 2
 */
export class FPCuadradoXY extends FuncionParam
{
   constructor() 
   {
      super()
      this.nombre = "cuadrado XY"
   }

   public evaluarPosicion( st : Vec2 ) : Vec3
   {
      Assert( 0.0 <= st.s && st.s <= 1.0, `valor 's' fuera de rango` )
      Assert( 0.0 <= st.t && st.t <= 1.0, `valor 't' fuera de rango` )

      return new Vec3([ 2.0*(st.s-0.5), 2.0*(st.t-0.5), 0.0 ])
   }
}

/**
 * Función de parametrización de una esfera
 */
export class FPEsfera extends FuncionParam 
{
   constructor() 
   {
      super()
      this.nombre = "esfera"
   }

   public evaluarPosicion( st : Vec2 ) : Vec3
   {
      Assert( 0.0 <= st.s && st.s <= 1.0, `valor 's' fuera de rango` )
      Assert( 0.0 <= st.t && st.t <= 1.0, `valor 't' fuera de rango` )

      const 
            a  : number = Math.PI * (2.0*st.s),
            b  : number = Math.PI * (st.t-0.5),
            ca : number = Math.cos( a ),
            sa : number = Math.sin( a ),
            cb : number = Math.cos( b ),
            sb : number = Math.sin( b ) 

      return new Vec3([ sa*cb, sb, ca*cb ])
   }
}

/**
 * Función de parametrización de un cilindro
 */
export class FPCilindro extends FuncionParam 
{
   constructor() 
   {
      super()
      this.nombre = "cilindro"
   }

   public evaluarPosicion( st : Vec2 ) : Vec3
   {
      Assert( 0.0 <= st.s && st.s <= 1.0, `valor 's' fuera de rango` )
      Assert( 0.0 <= st.t && st.t <= 1.0, `valor 't' fuera de rango` )

      const 
            a  : number = Math.PI * (2.0*st.s),
            ca : number = Math.cos( a ),
            sa : number = Math.sin( a )

      return new Vec3([ sa, st.t, ca ])
   }
}

/**
 * Función de parametrización de un cono
 */
export class FPCono extends FuncionParam 
{
   constructor() 
   {
      super()
      this.nombre = "cono"
   }

   public evaluarPosicion( st : Vec2 ) : Vec3
   {
      Assert( 0.0 <= st.s && st.s <= 1.0, `valor 's' fuera de rango` )
      Assert( 0.0 <= st.t && st.t <= 1.0, `valor 't' fuera de rango` )

      const 
            a  : number = Math.PI * (2.0*st.s),
            ca : number = Math.cos( a ),
            sa : number = Math.sin( a ),
            r  : number = 1.0-st.t

      return new Vec3([ r*sa, st.t, r*ca ])
   }
}


/**
 * Función de parametrización de una columna barroca
 */
export class FPColumna extends FuncionParam 
{
   constructor() 
   {
      super()
      this.nombre = "columna"
   }

   public evaluarPosicion( st : Vec2 ) : Vec3
   {
      Assert( 0.0 <= st.s && st.s <= 1.0, `valor 's' fuera de rango` )
      Assert( 0.0 <= st.t && st.t <= 1.0, `valor 't' fuera de rango` )

      const 
            a  : number = Math.PI * (2.0*st.s),
            ca : number = Math.cos( a ),
            sa : number = Math.sin( a ),
            r  : number = 1.0+0.1*Math.sin( 5.0* (a + 2.0*Math.PI*st.t) )

      return new Vec3([ r*ca, 10.0*(st.t-0.5), r*sa ])
   }
}

/** Función de parametrización de un toroide */

export class FPToroide extends FuncionParam 
{
   constructor() 
   {
      super()
      this.nombre = "toroide"
   }

   public evaluarPosicion( st : Vec2 ) : Vec3
   {
      Assert( 0.0 <= st.s && st.s <= 1.0, `valor 's' fuera de rango` )
      Assert( 0.0 <= st.t && st.t <= 1.0, `valor 't' fuera de rango` )

      const 
            a  : number = Math.PI * (2.0*st.s),
            b  : number = Math.PI * (2.0*(1.0-st.t)),
            ca : number = Math.cos( a ),
            sa : number = Math.sin( a ),
            cb : number = Math.cos( b ),
            sb : number = Math.sin( b ) 

      return new Vec3([ (1.0+0.5*cb)*ca, 0.5*sb, (1.0+0.5*cb)*sa ])
   }
}