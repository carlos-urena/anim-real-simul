#/bin/bash -f   



## compilar y obtener resultado en 'res'
make 
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
