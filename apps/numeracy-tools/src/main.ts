import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { installAnimationDiagnostics } from './animationDiagnostics'

installAnimationDiagnostics()

mount(App, { target: document.getElementById('app')! })
