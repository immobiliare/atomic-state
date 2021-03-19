import React from 'react';
import ReactDOM from 'react-dom';
import { DevToolsPanel } from '../components/DevToolsPanel';

const root = document.createElement('div');
document.body.appendChild(root);

ReactDOM.render(<DevToolsPanel />, root);
