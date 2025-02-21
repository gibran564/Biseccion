# Proyecto de Análisis y Graficación de Ecuaciones con Método de Disección

## Descripción
Este proyecto permite analizar ecuaciones matemáticas, descomponiéndolas en tokens para su correcta interpretación, y graficarlas en un entorno interactivo. La herramienta está desarrollada en HTML, JavaScript (con jQuery) y utiliza un canvas para la representación gráfica.

El sistema también implementa el **método de disección**, el cual permite encontrar raíces de ecuaciones mediante un enfoque iterativo basado en la división del intervalo de búsqueda.

## Características
- **Análisis léxico de ecuaciones**: Identificación de tokens matemáticos mediante un autómata.
- **Graficación en canvas**: Representación visual de la ecuación ingresada.
- **Interfaz intuitiva**: Un campo de texto para ingresar la ecuación y un botón para analizar y graficar.
- **Método de disección**: Aplicado para encontrar raíces de ecuaciones mediante intervalos sucesivos.

## Método de Disección
El **método de disección** es una técnica utilizada para encontrar raíces de ecuaciones de la forma \$( f(x) = 0 \$). Se basa en el principio de reducir iterativamente el intervalo de búsqueda hasta que se alcance una tolerancia deseada. Los pasos generales son:
1. Seleccionar un intervalo \$([a, b]\$) tal que \$( f(a) \cdot f(b) < 0 \$), lo que indica la existencia de al menos una raíz en el intervalo.
2. Dividir el intervalo en dos partes y evaluar el punto medio \$( c = \frac{a + b}{2} \$).
3. Determinar en qué subintervalo \$([a, c]\$) o \$([c, b]\$) se encuentra la raíz en función del signo de \$( f(c) \$).
4. Repetir el proceso hasta alcanzar una precisión deseada.

## Instrucciones de Uso
1. Ingresar una ecuación en el campo de texto.
2. Presionar el botón de "Analizar y Graficar".
3. Visualizar la ecuación representada en el canvas.
4. El método de disección calculará las raíces en un intervalo dado y mostrará los resultados.

## Tecnologías Utilizadas
- **HTML y CSS**: Estructura y estilos de la interfaz.
- **JavaScript con jQuery**: Manipulación de DOM y lógica de análisis.
- **Canvas**: Representación gráfica de la ecuación.

## Integrantes del Equipo
- **Espituñal Villanueva Christian Gibran 20041243**
- **José Ángel**
- **Rodriguez Villa Luis Jaret 22041191**
- **Manuel Guerrero Morales 23041209**

## Licencia
Este proyecto es de código abierto y puede ser utilizado con fines educativos y de desarrollo.

