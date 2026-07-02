/* ============================================================
   modules/debug.js
   Sistema de Logs de Depuración (Debug Logger) con Blob Export.
   ============================================================ */

export const ENABLED = true;
const MAX_HISTORY = 100000; // Suficiente para sesiones largas sin crashear

class DebugLoggerClass {
  constructor() {
    this.history = [];
  }

  _formatTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${now.getMilliseconds().toString().padStart(3,'0')}`;
  }

  _addHistory(entry) {
    if (!ENABLED) return;
    this.history.push({ time: this._formatTime(), ...entry });
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
  }

  getHistory() {
    return this.history;
  }

  logTrace(context, method, message = '') {
    if (!ENABLED) return;
    const msg = `[TRACE] ${context}::${method} ${message}`;
    this._addHistory({ type: 'trace', context, method, msg });
    console.debug(`%c${msg}`, 'color: #8a7ba6;');
  }

  logPhase(oldPhase, newPhase) {
    if (!ENABLED) return;
    const msg = `[PHASE] ${oldPhase} -> ${newPhase}`;
    this._addHistory({ type: 'phase', msg });
    console.log(`%c${msg}`, 'color: #00f0ff; font-weight: bold; background: #07060a; padding: 2px 4px; border-radius: 2px;');
  }

  logPhysics(message, data) {
    if (!ENABLED) return;
    this._addHistory({ type: 'physics', msg: message, data });
    console.log(`%c[PHYSICS] ${message}`, 'color: #ffd700; background: #120a1f; padding: 2px 4px;', data || '');
  }

  logMapGen(message, data) {
    if (!ENABLED) return;
    this._addHistory({ type: 'mapgen', msg: message, data });
    console.log(`%c[MAPGEN] ${message}`, 'color: #b6ff00; background: #07060a; padding: 2px 4px; border: 1px solid #b6ff00;', data || '');
  }

  logLogicError(context, message, currentData) {
    if (!ENABLED) return;
    this._addHistory({ type: 'error', context, msg: message, data: currentData });
    console.warn(`%c[ERROR - ${context}] ${message}`, 'color: #ff1133; font-weight: bold; background: #120a1f; border: 1px solid #ff1133; padding: 2px 4px;', currentData || '');
  }

  exportLogFile() {
    if (this.history.length === 0) {
      console.warn("No hay logs para exportar.");
      return;
    }

    let logText = "=== TC-SURVIVAL DEBUG LOG ===\n";
    logText += `Generado: ${new Date().toISOString()}\n`;
    logText += "==================================\n\n";

    this.history.forEach(entry => {
      let line = `[${entry.time}] ${entry.type.toUpperCase()}: `;
      if (entry.context && entry.method) line += `(${entry.context}::${entry.method}) `;
      if (entry.msg) line += entry.msg;
      if (entry.data) line += ` | DATA: ${JSON.stringify(entry.data)}`;
      logText += line + "\n";
    });

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tc-survival-debug_${Date.now()}.log`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Limpieza
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    console.log("%c[SYSTEM] Archivo .log exportado exitosamente.", "color: #b6ff00; font-weight: bold;");
  }
}

export const DebugLogger = new DebugLoggerClass();
