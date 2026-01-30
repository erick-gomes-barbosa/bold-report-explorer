// Bold Reports requires jQuery and React exposed globally
import jquery from 'jquery';
import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOM from 'react-dom';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    React: typeof React;
    createReactClass: typeof createReactClass;
    ReactDOM: typeof ReactDOM;
    $: typeof jquery;
    jQuery: typeof jquery;
  }
}

// Expose globals required by Bold Reports
window.React = React;
window.createReactClass = createReactClass;
window.ReactDOM = ReactDOM;
window.$ = window.jQuery = jquery;
