import jquery from 'jquery';
import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOM from 'react-dom';

// Polyfills para métodos jQuery removidos no v4.x, mas necessários pelo Bold Reports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jq = jquery as any;

// $.isWindow - removido no jQuery 4
if (typeof jq.isWindow !== 'function') {
  jq.isWindow = function(obj: unknown) {
    return obj != null && obj === (obj as Window).window;
  };
}

// $.isFunction - removido no jQuery 4
if (typeof jq.isFunction !== 'function') {
  jq.isFunction = function(obj: unknown) {
    return typeof obj === 'function';
  };
}

// $.isArray - depreciado, usa Array.isArray
if (typeof jq.isArray !== 'function') {
  jq.isArray = Array.isArray;
}

// $.isNumeric - removido no jQuery 4
if (typeof jq.isNumeric !== 'function') {
  jq.isNumeric = function(obj: unknown) {
    return !isNaN(parseFloat(obj as string)) && isFinite(obj as number);
  };
}

// $.type - removido no jQuery 4
if (typeof jq.type !== 'function') {
  jq.type = function(obj: unknown) {
    if (obj == null) return obj + '';
    const classToType: Record<string, string> = {};
    'Boolean Number String Function Array Date RegExp Object Error Symbol'.split(' ').forEach(name => {
      classToType['[object ' + name + ']'] = name.toLowerCase();
    });
    return typeof obj === 'object' || typeof obj === 'function'
      ? classToType[Object.prototype.toString.call(obj)] || 'object'
      : typeof obj;
  };
}

// $.parseJSON - Bold Reports usa internamente para processar respostas AJAX
if (typeof jq.parseJSON !== 'function') {
  jq.parseJSON = function(data: string | null) {
    if (data === null || data === undefined) {
      return null;
    }
    return JSON.parse(data + '');
  };
}

// $.trim - pode ser usado por widgets do Bold Reports
if (typeof jq.trim !== 'function') {
  jq.trim = function(text: string | null | undefined) {
    return text == null ? '' : (text + '').replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  };
}

// $.now - pode ser usado para timestamps
if (typeof jq.now !== 'function') {
  jq.now = Date.now;
}

// Expõe as dependências no escopo global (window) para os scripts base do Bold Reports
// Nota: O tipo Window.BoldReportViewerComponent é declarado em src/types/boldReportsViewer.d.ts
declare global {
  interface Window {
    React: typeof React;
    createReactClass: typeof createReactClass;
    ReactDOM: typeof ReactDOM;
    $: typeof jquery;
    jQuery: typeof jquery;
  }
}

window.React = React;
window.createReactClass = createReactClass;
window.ReactDOM = ReactDOM;
window.$ = window.jQuery = jquery;

export {};
