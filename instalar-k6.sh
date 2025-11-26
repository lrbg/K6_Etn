#!/bin/bash

echo "================================================="
echo "INSTALACIÓN Y CONFIGURACIÓN DE K6"
echo "================================================="

# Función para detectar el sistema operativo
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "mac"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)

echo "Sistema operativo detectado: $OS"
echo ""

# Instalación según el sistema operativo
case $OS in
    "linux")
        echo "Instalando K6 en Linux..."
        # Para Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            sudo gpg -k
            sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
            echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
            sudo apt-get update
            sudo apt-get install k6
        # Para RedHat/CentOS/Fedora
        elif command -v yum &> /dev/null; then
            sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
            sudo dnf install -y k6
        else
            echo "Descargando binario..."
            wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz
            tar -xzf k6-v0.47.0-linux-amd64.tar.gz
            sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
            rm -rf k6-v0.47.0-linux-amd64*
        fi
        ;;
    
    "mac")
        echo "Instalando K6 en macOS..."
        if command -v brew &> /dev/null; then
            brew install k6
        else
            echo "Homebrew no está instalado. Descargando binario..."
            curl -LO https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-macos-amd64.zip
            unzip k6-v0.47.0-macos-amd64.zip
            sudo mv k6-v0.47.0-macos-amd64/k6 /usr/local/bin/
            rm -rf k6-v0.47.0-macos-amd64*
        fi
        ;;
    
    "windows")
        echo "Para Windows, descarga K6 desde:"
        echo "https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-windows-amd64.zip"
        echo ""
        echo "O instala usando Chocolatey:"
        echo "choco install k6"
        ;;
    
    *)
        echo "Sistema operativo no reconocido. Descarga K6 manualmente desde:"
        echo "https://k6.io/docs/get-started/installation/"
        ;;
esac

# Verificar instalación
echo ""
echo "Verificando instalación..."
if command -v k6 &> /dev/null; then
    echo "✓ K6 instalado correctamente"
    k6 version
else
    echo "✗ K6 no se pudo instalar correctamente"
    exit 1
fi

echo ""
echo "================================================="
echo "INSTALACIÓN COMPLETADA"
echo "================================================="