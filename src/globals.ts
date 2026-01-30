import jquery from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import createReactClass from 'create-react-class';

// Bold Reports Viewer requires these globals
declare global {
  interface Window {
    React: typeof React;
    ReactDOM: typeof ReactDOM;
    createReactClass: typeof createReactClass;
    $: typeof jquery;
    jQuery: typeof jquery;
  }
}

window.React = React;
window.ReactDOM = ReactDOM;
window.createReactClass = createReactClass;
window.$ = window.jQuery = jquery;
