// Bold Reports requires jQuery and React exposed globally
// This file must be imported FIRST before any Bold Reports components
import jquery from 'jquery';
import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOM from 'react-dom';

// Expose globals required by Bold Reports
(window as any).React = React;
(window as any).createReactClass = createReactClass;
(window as any).ReactDOM = ReactDOM;
(window as any).$ = (window as any).jQuery = jquery;
