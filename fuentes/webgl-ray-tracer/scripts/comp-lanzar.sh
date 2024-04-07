#/bin/bash -f   

dir_src_ts="../src-ts"
dir_js="../public_html/js"
opciones="-strict -noEmitOnError -target ES2022 --outDir ${dir_js}"
archs_ts=$(ls -1 ${dir_src_ts}/*.ts)
 

## compilar y obtener resultado en 'res'
tsc $opciones $archs_ts
res=$?
echo "Resultado == " $res


## si no ha habido errores, lanzar servidor
if [ "$res" == "0" ] ; then 
   echo "Lanzando servidor, página raiz en 'localhost:8000' (o 'http://localhost:8000')" 
   pushd ../public_html >/dev/null
   python3 -m http.server
   popd >/dev/null
else
   echo "Errores: no se lanza servidor."
fi
