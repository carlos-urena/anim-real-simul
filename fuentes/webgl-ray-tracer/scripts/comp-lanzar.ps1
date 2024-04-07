#/bin/bash -f   

$dir_src_ts    = "../src-ts"
$dir_js        = "../public_html/js"
$opciones      = "-strict", "-noEmitOnError", "-target", "ES2022", "--outDir", $dir_js
$archs_ts      = Get-ChildItem -Path $dir_src_ts -Filter "*.ts"
$archs_ts_path = $archs_ts | ForEach-Object { "$dir_src_ts/$_" }

tsc @opciones @archs_ts_path

## si no ha habido errores, lanzar servidor, si ha habido, no hacer nada

if ( $LASTEXITCODE -ne 0 ) {
   echo "Han habido errores en la compilación"
}
else 
{
   echo "compilación ha ido bien"
   ##echo "Lanzando servidor, página raiz en 'localhost:8000' (o 'http://localhost:8000')" 
   Pushd ../public_html 
   python3 -m http.server
   Popd
}