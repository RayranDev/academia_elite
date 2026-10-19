<#
.SYNOPSIS
  Paso OPCIONAL (solo Windows con Microsoft Word instalado): deja los manuales .docx con el
  indice y los numeros de pagina calculados por Word, y exporta el PDF que Word genera.

.DESCRIPTION
  Para cada .docx de docs/manuales/salida/<rol>/ (el que produce `npm run manuales:build`):
    1. Abre el archivo con Word por COM, en segundo plano (sin ventana, sin avisos).
    2. Actualiza el indice (campos TOC) y el resto de campos, y vuelve a paginar.
    3. Guarda el .docx (ya con los numeros de pagina reales dentro).
    4. Exporta el PDF de Word junto al docx, con sufijo "_word.pdf".

  Reglas de seguridad:
    - Cada documento usa su propia instancia de Word, que este script inicia y cierra.
      Solo termina procesos WINWORD que el mismo script creo (los identifica por su Id).
      Nunca toca un Word que ya estuviera abierto; si no puede crear una instancia propia, se detiene.
    - Word se cierra SIEMPRE (bloque finally).
    - Un vigilante termina SOLO ese proceso si Word deja de responder (-TiempoMaximoSegundos por documento).

  Por que una instancia por documento: tras exportar a PDF, Word suele soltar la conexion COM
  (RPC_E_DISCONNECTED); empezar de cero con cada documento evita arrastrar ese estado.

.PARAMETER Rol
  Id del rol a procesar (super-admin, escuela, entrenador, jugador, segun docs/manuales/roles.json). Sin valor: todos los que tengan .docx. Las carpetas que no son de un rol (p. ej. previos-*) nunca se tocan.

.PARAMETER Carpeta
  Carpeta de salida. Por defecto docs/manuales/salida (relativa a la raiz del proyecto).

.PARAMETER TiempoMaximoSegundos
  Segundos que se espera a Word por cada documento antes de darlo por colgado. Por defecto 240.

.EXAMPLE
  npm run manuales:word
  npm run manuales:word -- -Rol entrenador
#>
param(
  [string]$Rol = "",
  [string]$Carpeta = "",
  [int]$TiempoMaximoSegundos = 240
)

$ErrorActionPreference = "Stop"

function Write-Fallo([string]$mensaje) {
  Write-Host $mensaje -ForegroundColor Red
}

# Procesa UN documento con una instancia propia de Word. Devuelve $true si todo salio bien.
function Update-Manual([System.IO.FileInfo]$archivo, [int]$limite) {
  $pdfFinal = Join-Path $archivo.DirectoryName ($archivo.BaseName + "_word.pdf")
  Write-Host "- $($archivo.Directory.Name)/$($archivo.Name)"

  # Se trabaja sobre una copia en una carpeta temporal: Word no toca el original hasta que todo salio bien
  # y no hay avisos de "archivo bloqueado" si el .docx ya estuviera abierto en otra parte.
  $temporal = Join-Path ([System.IO.Path]::GetTempPath()) ("manuales-word-" + [Guid]::NewGuid().ToString("N"))
  [void](New-Item -ItemType Directory -Path $temporal)
  # [string] explicito: el valor de Join-Path llega a COM envuelto en PSObject y ExportAsFixedFormat se queda colgado.
  $ruta = [string](Join-Path $temporal $archivo.Name)
  $pdf = [string](Join-Path $temporal ($archivo.BaseName + "_word.pdf"))
  Copy-Item -LiteralPath $archivo.FullName -Destination $ruta

  # Procesos de Word que ya existian: no son nuestros y no se tocan jamas.
  $idsPrevios = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })

  $word = $null
  $idPropio = $null
  $vigilante = $null
  $estado = [hashtable]::Synchronized(@{ Fin = $false; Latido = [DateTime]::UtcNow; Matado = $false })
  $ok = $false

  try {
    try {
      $word = New-Object -ComObject Word.Application
    } catch {
      Write-Fallo "    ERROR: no se pudo iniciar Microsoft Word. Este paso es opcional y requiere Word instalado en Windows. Detalle: $($_.Exception.Message)"
      return $false
    }

    # Identifica el proceso que acabamos de crear (el unico WINWORD que no estaba antes).
    Start-Sleep -Milliseconds 800
    $nuevos = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | Where-Object { $idsPrevios -notcontains $_.Id })
    if ($nuevos.Count -ge 1) { $idPropio = $nuevos[0].Id }
    if ($null -eq $idPropio) {
      # Word reutilizo una instancia que ya estaba abierta: no es nuestra, no se usa ni se cierra.
      $word = $null
      Write-Fallo "    ERROR: Word ya esta abierto y no se pudo crear una instancia propia. Cierra Word e intentalo de nuevo (este script nunca cierra un Word que no inicio)."
      return $false
    }

    $word.Visible = $false
    $word.DisplayAlerts = 0              # wdAlertsNone
    $word.AutomationSecurity = 3         # msoAutomationSecurityForceDisable: sin avisos de macros

    # Vigilante en otro hilo: si Word no da senales de vida durante el tiempo maximo, termina SOLO nuestro proceso.
    $vigilante = [powershell]::Create()
    [void]$vigilante.AddScript({
      param($e, $idWord, $max)
      while (-not $e.Fin) {
        Start-Sleep -Seconds 2
        if (([DateTime]::UtcNow - $e.Latido).TotalSeconds -gt $max) {
          Stop-Process -Id $idWord -Force -ErrorAction SilentlyContinue
          $e.Matado = $true
          break
        }
      }
    }).AddArgument($estado).AddArgument($idPropio).AddArgument($limite)
    $null = $vigilante.BeginInvoke()

    $doc = $null
    $exportado = $false
    try {
      # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles)
      $doc = $word.Documents.Open($ruta, $false, $false, $false)

      # El indice cambia al llenarse de numeros: se actualiza, se repagina y se vuelve a actualizar.
      for ($pasada = 1; $pasada -le 2; $pasada++) {
        $estado.Latido = [DateTime]::UtcNow
        foreach ($toc in $doc.TablesOfContents) { [void]$toc.Update() }
        [void]$doc.Fields.Update()
        [void]$doc.Repaginate()
      }

      [void]$doc.Save()
      $paginas = $doc.ComputeStatistics(2)   # wdStatisticPages (antes de exportar, ver nota)
      $estado.Latido = [DateTime]::UtcNow

      # ExportAsFixedFormat(Salida, wdExportFormatPDF = 17, OpenAfterExport = false, OptimizeFor = wdExportOptimizeForPrint = 0)
      # Nota: tras exportar, Word suele soltar la conexion COM del documento (RPC_E_DISCONNECTED).
      # El PDF queda bien escrito; por eso despues de esta linea no se vuelve a depender de $doc.
      [void]$doc.ExportAsFixedFormat($pdf, 17, $false, 0)
      $exportado = $true
      Write-Host "    Indice actualizado. Word: $paginas paginas -> $(Split-Path -Leaf $pdf)"
    } catch {
      if ($estado.Matado) {
        Write-Fallo "    ERROR: Word dejo de responder y se termino su proceso (Id $idPropio). Reintenta el paso."
      } elseif ($exportado) {
        # Fallo posterior al PDF exportado (conexion COM soltada): no afecta al resultado.
      } else {
        Write-Fallo "    ERROR: $($_.Exception.Message)"
      }
    } finally {
      if ($null -ne $doc) {
        try { $doc.Close(0) } catch { }   # wdDoNotSaveChanges: ya se guardo arriba
      }
    }
  } finally {
    $estado.Fin = $true
    if ($null -ne $word) {
      try { $word.Quit(0) } catch { }
      try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) } catch { }
    }
    # Si Word no se fue solo, se termina NUESTRO proceso por Id (jamas por nombre).
    if ($null -ne $idPropio) {
      for ($i = 0; $i -lt 10; $i++) {
        if ($null -eq (Get-Process -Id $idPropio -ErrorAction SilentlyContinue)) { break }
        Start-Sleep -Milliseconds 500
      }
      $resto = Get-Process -Id $idPropio -ErrorAction SilentlyContinue
      if ($null -ne $resto -and $resto.ProcessName -eq "WINWORD") {
        Stop-Process -Id $idPropio -Force -ErrorAction SilentlyContinue
      }
    }
    if ($null -ne $vigilante) { try { $vigilante.Stop() } catch { }; try { $vigilante.Dispose() } catch { } }

    # Con Word ya cerrado, se devuelven los resultados al destino (solo si el PDF se exporto bien).
    if ($exportado -and (Test-Path -LiteralPath $pdf)) {
      try {
        Copy-Item -LiteralPath $ruta -Destination $archivo.FullName -Force
        Copy-Item -LiteralPath $pdf -Destination $pdfFinal -Force
        $ok = $true
      } catch {
        Write-Fallo "    ERROR: no se pudo escribir el resultado en '$($archivo.DirectoryName)' (cierra el .docx si lo tienes abierto). Detalle: $($_.Exception.Message)"
      }
    }
    try { Remove-Item -LiteralPath $temporal -Recurse -Force -ErrorAction SilentlyContinue } catch { }
  }
  return $ok
}

$raiz = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if ([string]::IsNullOrWhiteSpace($Carpeta)) { $Carpeta = Join-Path $raiz "docs\manuales\salida" }
if (-not (Test-Path -LiteralPath $Carpeta)) {
  Write-Fallo "No existe la carpeta de salida '$Carpeta'. Ejecuta primero: npm run manuales:build"
  exit 1
}

# Solo se procesan las carpetas de los roles declarados en docs/manuales/roles.json (nunca carpetas ajenas
# como "previos-*" u otras copias archivadas), o unicamente la del rol pedido.
$idsRoles = @((Get-Content -LiteralPath (Join-Path $raiz "docs/manuales/roles.json") -Raw -Encoding UTF8 | ConvertFrom-Json).roles | ForEach-Object { $_.id })
if ($Rol -ne "" -and $idsRoles -notcontains $Rol) {
  Write-Fallo "Rol desconocido '$Rol'. Roles validos: $($idsRoles -join ', ')"
  exit 1
}

# Documentos a procesar: los .docx de cada carpeta de rol.
$documentos = @()
foreach ($c in (Get-ChildItem -LiteralPath $Carpeta -Directory | Where-Object { ($idsRoles -contains $_.Name) -and ($Rol -eq "" -or $_.Name -eq $Rol) })) {
  $documentos += Get-ChildItem -LiteralPath $c.FullName -Filter "*.docx" -File | Where-Object { -not $_.Name.StartsWith('~$') }
}
if ($documentos.Count -eq 0) {
  Write-Fallo "No hay .docx para procesar en '$Carpeta'. Ejecuta primero: npm run manuales:build"
  exit 1
}

$fallos = 0
foreach ($archivo in $documentos) {
  $resultado = @(Update-Manual $archivo $TiempoMaximoSegundos)
  if ($resultado[-1] -ne $true) { $fallos++ }
}

if ($fallos -gt 0) {
  Write-Fallo "`nTerminado con $fallos documento(s) con error."
  exit 1
}
Write-Host "`nListo: indice actualizado por Word y PDF *_word.pdf exportado junto a cada .docx."
