$(document).ready(function() {
    $.EcuacionCuadratica = function(options) {
        this.settings = $.extend({
            inputSelector: '#ecuacion',
            resultadoSelector: '#resultado',
            canvasSelector: '#grafica',
            tolerancia: 0.0001,
            maxIteraciones: 100
        }, options);

        this.init();
    };

    $.EcuacionCuadratica.prototype = {
        init: function() {
            this.errores = [];
            this.tokens = [];
            this.parentesisStack = [];
            this.ecuacionOriginal = ""; // Guardará la ecuación normalizada
            this.bindEvents();
            this.setupCanvas();
        },

        bindEvents: function() {
            var self = this;
            $(this.settings.inputSelector).on('input', function() {
                self.validarSintaxis($(this).val());
            });
        },

        setupCanvas: function() {
            this.$canvas = $(this.settings.canvasSelector);
        
            this.$canvas[0].width = this.$canvas.width();
            this.$canvas[0].height = this.$canvas.height();
        
            this.ctx = this.$canvas[0].getContext('2d');
        
            this.escala = 20;
            this.origenX = this.$canvas[0].width / 2;
            this.origenY = this.$canvas[0].height / 2;
        },
        
        validarSintaxis: function(ecuacion) {
            // Normalizar: quitar espacios, convertir x² a x^2, etc.
            ecuacion = ecuacion.replace(/\s+/g, '')
                               .replace(/\*\*x²/g, 'x^2')
                               .replace(/\*\*x\^2/g, 'x^2')
                               .replace(/x²/g, 'x^2');
            this.ecuacionOriginal = ecuacion; // Guardamos la ecuación normalizada para evaluarla luego

            // Reiniciar errores, tokens y el stack de paréntesis
            this.errores = [];
            this.tokens = [];
            this.parentesisStack = [];

            try {
                this.tokens = this.tokenize(ecuacion);
            } catch (e) {
                this.errores.push(e.message);
            }

            if (this.parentesisStack.length > 0) {
                this.errores.push("Error: Paréntesis sin cerrar.");
            }

            var coeficientes = this.extraerCoeficientes();
            var tipoEcuacion = this.determinarTipoEcuacion();

            // Primero validamos los casos especiales de ecuaciones con raíces
            if (tipoEcuacion === "ecuacion_con_raiz_compleja") {
                this.errores.push("La ecuación contiene raíces que al resolverse producen una ecuación de grado superior a 2. El método de disección no es aplicable.");
            } else if (tipoEcuacion === "cuadratica_con_raiz") {
                // Aquí podríamos intentar transformar la ecuación
                this.errores.push("La ecuación contiene raíces. Se recomienda transformar la ecuación a forma estándar antes de aplicar el método de disección.");
            } 
            // Luego validamos si es cuadrática con coeficiente 0
            else if (tipoEcuacion === "cuadratica" && coeficientes.a === 0) {
                tipoEcuacion = "lineal";
                this.errores.push("Error: Se detectó ecuación lineal (coeficiente de x² es 0).");
            }
            // Finalmente validamos si el tipo es válido para el método
            else if (tipoEcuacion !== "cuadratica" && tipoEcuacion !== "lineal" && tipoEcuacion !== "constante") {
                this.errores.push("Error: La ecuación es de tipo '" + tipoEcuacion + "'. El método de disección sólo es aplicable a ecuaciones cuadráticas.");
            }

            var resultado = {
                esValida: this.errores.length === 0,
                errores: this.errores,
                tokens: this.tokens,
                coeficientes: coeficientes,
                tipoEcuacion: tipoEcuacion
            };

            this.mostrarResultado(resultado);
            return resultado;
        },

        tokenize: function(ecuacion) {
            var tokens = [];
            var i = 0;
        
            // Normalizar la notación de raíz cuadrada: (x)^(1/2) -> √(x)
            ecuacion = ecuacion.replace(/\^\(1\/2\)/g, '^0.5');
            ecuacion = ecuacion.replace(/\^0\.5/g, '_sqrt_');  // Marcador temporal
        
            while (i < ecuacion.length) {
                var char = ecuacion[i];
        
                // Manejar números (incluyendo decimales)
                if (/\d/.test(char) || (char === '.' && i + 1 < ecuacion.length && /\d/.test(ecuacion[i + 1]))) {
                    var numStr = "";
                    var dotCount = 0;
                    while (i < ecuacion.length && (/\d/.test(ecuacion[i]) || ecuacion[i] === '.')) {
                        if (ecuacion[i] === '.') {
                            dotCount++;
                            if (dotCount > 1) {
                                throw new Error("Error: Número con más de un punto decimal en posición " + (i + 1));
                            }
                        }
                        numStr += ecuacion[i];
                        i++;
                    }
                    tokens.push({ tipo: 'coeficiente', valor: parseFloat(numStr), lexema: numStr });
                    continue;
                }
        
                // Manejar variables
                if (/[a-zA-Z]/.test(char)) {
                    tokens.push({ tipo: 'variable', valor: char, lexema: char });
                    i++;
                    continue;
                }
        
                // Manejar marcador temporal de raíz cuadrada
                if (char === '_' && ecuacion.substring(i, i + 5) === '_sqrt_') {
                    tokens.push({ tipo: 'operador', valor: '√', lexema: '√' });
                    i += 5;
                    continue;
                }
        
                // Manejar exponentes
                if (char === '^') {
                    i++;
                    var expStr = "";
                    var expNegativo = false;
                    
                    // Manejar paréntesis en exponentes
                    if (i < ecuacion.length && ecuacion[i] === '(') {
                        i++; // Saltar el paréntesis de apertura
                        let parentesisCount = 1;
                        
                        while (i < ecuacion.length && parentesisCount > 0) {
                            if (ecuacion[i] === '(') parentesisCount++;
                            if (ecuacion[i] === ')') parentesisCount--;
                            
                            if (parentesisCount > 0) {
                                expStr += ecuacion[i];
                            }
                            i++;
                        }
                    } else {
                        // Manejar exponentes simples
                        if (ecuacion[i] === '-') {
                            expNegativo = true;
                            i++;
                        }
                        while (i < ecuacion.length && (/\d/.test(ecuacion[i]) || ecuacion[i] === '.')) {
                            expStr += ecuacion[i];
                            i++;
                        }
                    }
        
                    if (expStr === "") {
                        throw new Error("Error: Se esperaba un exponente después de '^' en posición " + i);
                    }
        
                    // Evaluar el exponente
                    let expValue;
                    try {
                        expValue = expNegativo ? -eval(expStr) : eval(expStr);
                    } catch (e) {
                        throw new Error("Error: Exponente inválido en posición " + i);
                    }
        
                    tokens.push({ tipo: 'exponente', valor: expValue, lexema: '^' + expStr });
                    continue;
                }
        
                // Manejar operadores básicos y paréntesis
                if (['+', '-', '*', '/', '√', '(', ')'].includes(char)) {
                    if (char === '(' || char === ')') {
                        tokens.push({ 
                            tipo: char === '(' ? 'parentesis_abierto' : 'parentesis_cerrado',
                            valor: char,
                            lexema: char
                        });
                    } else {
                        tokens.push({ tipo: 'operador', valor: char, lexema: char });
                    }
                    i++;
                    continue;
                }
        
                // Si llegamos aquí, el carácter no es válido
                if (!/\s/.test(char)) { // Ignorar espacios en blanco
                    throw new Error("Error: Carácter inválido '" + char + "' en posición " + (i + 1));
                }
                i++;
            }
        
            return tokens;
        },

        extraerCoeficientes: function() {
            var a = 0, b = 0, c = 0;
            var currentSign = 1;
            var i = 0;

            while (i < this.tokens.length) {
                var token = this.tokens[i];

                // Si es operador, se determina el signo.
                if (token.tipo === 'operador') {
                    // Si el operador es '√', lo ignoramos en la extracción de coeficientes polinómicos
                    if(token.valor === '√'){
                        i++;
                        continue;
                    }
                    currentSign = (token.valor === '-' ? -1 : 1);
                    i++;
                    continue;
                }

                // Saltamos paréntesis
                if (token.tipo === 'parentesis_abierto' || token.tipo === 'parentesis_cerrado') {
                    i++;
                    continue;
                }

                // Procesar término: puede iniciar con un coeficiente o directamente con una variable.
                var coef = 1;
                if (token.tipo === 'coeficiente') {
                    coef = token.valor;
                    i++;
                }
                coef *= currentSign;

                // Si le sigue una variable, es un término con x.
                if (i < this.tokens.length && this.tokens[i].tipo === 'variable') {
                    i++; // Consumir la variable
                    // Por defecto, sin exponente se asume 1 (término lineal)
                    var exponente = 1;
                    if (i < this.tokens.length && this.tokens[i].tipo === 'exponente') {
                        exponente = this.tokens[i].valor;
                        i++;
                    }

                    if (exponente === 2) {
                        a += coef;
                    } else if (exponente === 1) {
                        b += coef;
                    } else {
                        this.errores.push("Error: Exponente " + exponente + " no soportado para ecuaciones polinómicas.");
                    }
                } else {
                    // Término constante
                    c += coef;
                }

                currentSign = 1;
            }

            return { a: a, b: b, c: c };
        },

        determinarTipoEcuacion: function() {
            var variableName = null;
            var multipleVariables = false;
            var hasSqrt = false;
            // Recorremos los tokens para detectar algunas características
            for (var i = 0; i < this.tokens.length; i++) {
                var token = this.tokens[i];
                if (token.tipo === 'operador' && token.valor === '√') {
                    hasSqrt = true;
                }
                if (token.tipo === 'variable') {
                    if (!variableName) {
                        variableName = token.valor;
                    } else if (token.valor !== variableName) {
                        multipleVariables = true;
                    }
                }
                if (token.tipo === 'exponente') {
                    var exp = token.valor;
                    if (exp !== 1 && exp !== 2) {
                        return "incompatible";
                    }
                }
            }
            if (multipleVariables) {
                return "multivariable";
            }
            if (hasSqrt) {
                // Analizar la estructura dentro de la raíz
                let contenidoRaiz = this.analizarContenidoRaiz();
                if (contenidoRaiz.gradoMaximo <= 1) {
                    return "cuadratica_con_raiz";  // Podría transformarse
                }
                return "ecuacion_con_raiz_compleja";  // No se puede resolver con bisección
            }
            var coef = this.extraerCoeficientes();
            if (coef.a !== 0) {
                return "cuadratica";
            } else if (coef.b !== 0) {
                return "lineal";
            } else {
                return "constante";
            }
        },

        mostrarResultado: function(resultado) {
            var $resultado = $(this.settings.resultadoSelector);
            var mensaje = "";
            if (!resultado.esValida) {
                mensaje += '<div class="error">Errores: ' + resultado.errores.join(', ') + '</div>';
                // Se continúa para graficar aunque la ecuación no sea compatible con el método de disección
            } else {
                mensaje += '<div class="success"><p>Ecuación ' + resultado.tipoEcuacion + ' válida: ';
                if(resultado.tipoEcuacion === "cuadratica" || resultado.tipoEcuacion === "lineal" || resultado.tipoEcuacion === "constante"){
                    var a = resultado.coeficientes.a,
                        b = resultado.coeficientes.b,
                        c = resultado.coeficientes.c;
                    mensaje += a + 'x² + ' + b + 'x + ' + c;
                } else {
                    mensaje += this.ecuacionOriginal;
                }
                mensaje += '</p></div>';
            }
            $resultado.html(mensaje);

            // Graficar la función
            if (resultado.tipoEcuacion === "cuadratica" || resultado.tipoEcuacion === "lineal" || resultado.tipoEcuacion === "constante") {
                this.graficarEcuacion(resultado.coeficientes);
            } else {
                this.graficarFuncion();
            }

            // Ejecutar el método de bisección sólo para ecuaciones cuadráticas
            if (resultado.tipoEcuacion === "cuadratica") {
                this.metodoBiseccion();
            }
        },
        transformarEcuacionConRaiz: function() {
            // Almacenará los pasos de la transformación para mostrar al usuario
            this.pasosTransformacion = [];
            
            // Si no hay tokens válidos, retornamos
            if (!this.tokens || this.tokens.length === 0) {
                return null;
            }
        
            // Identificar el patrón de la ecuación con raíz
            let patron = this.identificarPatronRaiz();
            
            // Si no se identifica un patrón válido, retornamos
            if (!patron) {
                this.errores.push("No se pudo identificar un patrón válido en la ecuación con raíz.");
                return null;
            }
        
            // Basado en el patrón, aplicamos la transformación correspondiente
            let ecuacionTransformada = null;
            
            switch (patron.tipo) {
                case 'simple':
                    // Caso: ax² + √(bx) + c = 0
                    ecuacionTransformada = this.transformarRaizSimple(patron);
                    break;
                case 'compuesta':
                    // Caso: ax² + √(bx + c) + d = 0
                    ecuacionTransformada = this.transformarRaizCompuesta(patron);
                    break;
                case 'multiple':
                    // Caso: √(ax) + √(bx) = c
                    ecuacionTransformada = this.transformarRaizMultiple(patron);
                    break;
                default:
                    this.errores.push("Patrón de raíz no soportado.");
                    return null;
            }
        
            return ecuacionTransformada;
        },
        
        identificarPatronRaiz: function() {
            let patron = {
                tipo: null,
                terminos: [],
                raices: []
            };
        
            let dentroRaiz = false;
            let terminoActual = [];
            
            for (let i = 0; i < this.tokens.length; i++) {
                let token = this.tokens[i];
                
                if (token.tipo === 'operador' && token.valor === '√') {
                    dentroRaiz = true;
                    let contenidoRaiz = this.extraerContenidoRaiz(i);
                    if (contenidoRaiz) {
                        patron.raices.push(contenidoRaiz);
                        i += contenidoRaiz.tokens.length;
                    }
                } else if (!dentroRaiz) {
                    terminoActual.push(token);
                }
                
                if (token.tipo === 'operador' && (token.valor === '+' || token.valor === '-')) {
                    if (terminoActual.length > 0) {
                        patron.terminos.push(terminoActual);
                        terminoActual = [];
                    }
                }
            }
            
            // Añadir el último término si existe
            if (terminoActual.length > 0) {
                patron.terminos.push(terminoActual);
            }
        
            // Determinar el tipo de patrón
            patron.tipo = this.determinarTipoPatron(patron);
            
            return patron;
        },
        
        extraerContenidoRaiz: function(inicioIndex) {
            let contenido = {
                tokens: [],
                grado: 0,
                coeficientes: {}
            };
            
            let parentesisCount = 0;
            let i = inicioIndex + 1;
            
            // Si hay un paréntesis abierto después de la raíz
            if (this.tokens[i] && this.tokens[i].tipo === 'parentesis_abierto') {
                parentesisCount++;
                i++;
                
                while (i < this.tokens.length && parentesisCount > 0) {
                    let token = this.tokens[i];
                    
                    if (token.tipo === 'parentesis_abierto') parentesisCount++;
                    if (token.tipo === 'parentesis_cerrado') parentesisCount--;
                    
                    if (parentesisCount > 0) {
                        contenido.tokens.push(token);
                        
                        // Analizar el grado y coeficientes dentro de la raíz
                        if (token.tipo === 'variable') {
                            let exp = 1;
                            if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'exponente') {
                                exp = this.tokens[i + 1].valor;
                            }
                            contenido.grado = Math.max(contenido.grado, exp);
                        }
                    }
                    i++;
                }
            }
            
            return contenido;
        },
        
        determinarTipoPatron: function(patron) {
            if (patron.raices.length === 0) return null;
            
            if (patron.raices.length === 1) {
                // Verificar si el contenido de la raíz es simple (solo bx) o compuesto (bx + c)
                let raiz = patron.raices[0];
                let tieneTerminoIndependiente = raiz.tokens.some(t => 
                    t.tipo === 'coeficiente' && !raiz.tokens[raiz.tokens.indexOf(t) + 1]?.tipo === 'variable'
                );
                
                return tieneTerminoIndependiente ? 'compuesta' : 'simple';
            }
            
            return 'multiple';
        },
        
        transformarRaizSimple: function(patron) {
            // Caso: ax² + √(bx) + c = 0
            this.pasosTransformacion.push("Ecuación original: ax² + √(bx) + c = 0");
            this.pasosTransformacion.push("Paso 1: Aislar la raíz: √(bx) = -ax² - c");
            this.pasosTransformacion.push("Paso 2: Elevar al cuadrado ambos lados: bx = a²x⁴ + 2acx² + c²");
            this.pasosTransformacion.push("Paso 3: Reorganizar: a²x⁴ + 2acx² - bx + c² = 0");
            
            // Aquí retornaríamos la ecuación transformada
            return {
                tipo: "polinomica",
                grado: 4,
                coeficientes: this.calcularCoeficientesTransformados(patron)
            };
        },
        
        transformarRaizCompuesta: function(patron) {
            // Caso: ax² + √(bx + d) + c = 0
            this.pasosTransformacion.push("Ecuación original: ax² + √(bx + d) + c = 0");
            this.pasosTransformacion.push("Paso 1: Aislar la raíz: √(bx + d) = -ax² - c");
            this.pasosTransformacion.push("Paso 2: Elevar al cuadrado: bx + d = a²x⁴ + 2acx² + c²");
            this.pasosTransformacion.push("Paso 3: Reorganizar: a²x⁴ + 2acx² - bx + (c² - d) = 0");
            
            return {
                tipo: "polinomica",
                grado: 4,
                coeficientes: this.calcularCoeficientesTransformados(patron)
            };
        },
        
        transformarRaizMultiple: function(patron) {
            // Caso: √(ax) + √(bx) = c
            this.pasosTransformacion.push("Ecuación original: √(ax) + √(bx) = c");
            this.pasosTransformacion.push("Paso 1: Restar √(bx) de ambos lados: √(ax) = c - √(bx)");
            this.pasosTransformacion.push("Paso 2: Elevar al cuadrado: ax = c² - 2c√(bx) + bx");
            this.pasosTransformacion.push("Paso 3: Agrupar términos con raíz: 2c√(bx) = c² - ax + bx");
            this.pasosTransformacion.push("Paso 4: Elevar al cuadrado: 4c²bx = (c² - ax + bx)²");
            
            return {
                tipo: "polinomica",
                grado: 4,
                coeficientes: this.calcularCoeficientesTransformados(patron)
            };
        },
        
        calcularCoeficientesTransformados: function(patron) {
           return {
                x4: 'a²',
                x3: '0',
                x2: '2ac',
                x1: '-b',
                x0: 'c²'
            };
        },
        graficarEcuacion: function(coef) {
            var a = coef.a, b = coef.b, c = coef.c;
            var ctx = this.ctx;
            var width = this.$canvas[0].width;
            var height = this.$canvas[0].height;
        
            ctx.clearRect(0, 0, width, height);
        
            // Dibujar ejes
            ctx.beginPath();
            ctx.strokeStyle = '#666';
            ctx.moveTo(0, this.origenY);
            ctx.lineTo(width, this.origenY);
            ctx.moveTo(this.origenX, 0);
            ctx.lineTo(this.origenX, height);
            ctx.stroke();
        
            ctx.beginPath();
            ctx.strokeStyle = '#00f';
            ctx.lineWidth = 2;
        
            for (var i = 0; i < width; i++) {
                var x = (i - this.origenX) / this.escala;
                var y = a * x * x + b * x + c;
                var canvasY = this.origenY - (y * this.escala);
        
                if (i === 0) {
                    ctx.moveTo(i, canvasY);
                } else {
                    ctx.lineTo(i, canvasY);
                }
            }
            ctx.stroke();
        },

        graficarFuncion: function() {
            var ctx = this.ctx;
            var width = this.$canvas[0].width;
            var height = this.$canvas[0].height;
        
            ctx.clearRect(0, 0, width, height);
        
            // Dibujar ejes
            ctx.beginPath();
            ctx.strokeStyle = '#666';
            ctx.moveTo(0, this.origenY);
            ctx.lineTo(width, this.origenY);
            ctx.moveTo(this.origenX, 0);
            ctx.lineTo(this.origenX, height);
            ctx.stroke();
        
            ctx.beginPath();
            ctx.strokeStyle = '#00f';
            ctx.lineWidth = 2;
        
            for (var i = 0; i < width; i++) {
                var x = (i - this.origenX) / this.escala;
                var y = this.evaluarFuncion(x);
                var canvasY = this.origenY - (y * this.escala);
                if (i === 0) {
                    ctx.moveTo(i, canvasY);
                } else {
                    ctx.lineTo(i, canvasY);
                }
            }
            ctx.stroke();
        },

        // Añadir la función para analizar el contenido dentro de la raíz
analizarContenidoRaiz: function() {
    let resultado = {
        gradoMaximo: 0,
        terminos: []
    };
    
    let dentroRaiz = false;
    let terminoActual = [];
    
    for (let i = 0; i < this.tokens.length; i++) {
        let token = this.tokens[i];
        
        if (token.tipo === 'operador' && token.valor === '√') {
            dentroRaiz = true;
            continue;
        }
        
        if (dentroRaiz) {
            if (token.tipo === 'parentesis_abierto') {
                continue;
            }
            
            if (token.tipo === 'parentesis_cerrado') {
                if (terminoActual.length > 0) {
                    resultado.terminos.push(terminoActual);
                }
                dentroRaiz = false;
                terminoActual = [];
                continue;
            }
            
            if (token.tipo === 'variable') {
                let exponente = 1;
                if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'exponente') {
                    exponente = this.tokens[i + 1].valor;
                    resultado.gradoMaximo = Math.max(resultado.gradoMaximo, exponente);
                    i++; // Saltar el token del exponente
                } else {
                    resultado.gradoMaximo = Math.max(resultado.gradoMaximo, 1);
                }
            }
            
            terminoActual.push(token);
        }
    }
    
    return resultado;
},

evaluarFuncion: function(x) {
    let resultado = 0;
    let dentroRaiz = false;
    let valorRaiz = 0;
    let signoActual = 1;
    
    for (let i = 0; i < this.tokens.length; i++) {
        let token = this.tokens[i];
        
        if (token.tipo === 'operador') {
            if (token.valor === '√') {
                dentroRaiz = true;
                continue;
            }
            signoActual = token.valor === '-' ? -1 : 1;
            continue;
        }
        
        if (token.tipo === 'parentesis_abierto' && dentroRaiz) {
            valorRaiz = 0;
            continue;
        }
        
        if (token.tipo === 'parentesis_cerrado' && dentroRaiz) {
            resultado += signoActual * Math.sqrt(valorRaiz);
            dentroRaiz = false;
            signoActual = 1;
            continue;
        }
        
        if (token.tipo === 'coeficiente') {
            let valor = token.valor * signoActual;
            if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'variable') {
                let exponente = 1;
                if (i + 2 < this.tokens.length && this.tokens[i + 2].tipo === 'exponente') {
                    exponente = this.tokens[i + 2].valor;
                    i += 2;
                } else {
                    i++;
                }
                
                if (dentroRaiz) {
                    valorRaiz += valor * Math.pow(x, exponente);
                } else {
                    resultado += valor * Math.pow(x, exponente);
                }
            } else {
                if (dentroRaiz) {
                    valorRaiz += valor;
                } else {
                    resultado += valor;
                }
            }
            signoActual = 1;
        }
        
        if (token.tipo === 'variable') {
            let exponente = 1;
            if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'exponente') {
                exponente = this.tokens[i + 1].valor;
                i++;
            }
            
            if (dentroRaiz) {
                valorRaiz += signoActual * Math.pow(x, exponente);
            } else {
                resultado += signoActual * Math.pow(x, exponente);
            }
            signoActual = 1;
        }
    }
    
    return resultado;
},

        metodoBiseccion: function() {
            // Método de bisección (disección) aplicado sobre la evaluación polinómica
            let xValue = 2;
            let resultado = 0;
            let i = 0;
            let signo = 1;
        
            while (i < this.tokens.length) {
                let token = this.tokens[i];
        
                if (token.tipo === 'operador') {
                    signo = (token.valor === '-') ? -1 : 1;
                    i++;
                    continue;
                }
        
                if (token.tipo === 'coeficiente') {
                    let coef = token.valor * signo;
                    if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'variable') {
                        i++;
                        let exponente = 1; 
                        if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'exponente') {
                            exponente = this.tokens[i + 1].valor;
                            i++;
                        }
                        resultado += coef * Math.pow(xValue, exponente);
                    } else {
                        resultado += coef;
                    }
                    signo = 1;
                    i++;
                    continue;
                }
        
                if (token.tipo === 'variable') {
                    let coef = signo;
                    let exponente = 1;
                    if (i + 1 < this.tokens.length && this.tokens[i + 1].tipo === 'exponente') {
                        exponente = this.tokens[i + 1].valor;
                        i++;
                    }
                    resultado += coef * Math.pow(xValue, exponente);
                    signo = 1;
                    i++;
                    continue;
                }
        
                i++;
            }
        
            console.log("Evaluación de la ecuación en x =", xValue, "es:", resultado);
        }
    };

    $.fn.ecuacionCuadratica = function(options) {
        return this.each(function() {
            if (!$.data(this, 'ecuacionCuadratica')) {
                $.data(this, 'ecuacionCuadratica', new $.EcuacionCuadratica(options));
            }
        });
    };
});
