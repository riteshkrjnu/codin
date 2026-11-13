#!/usr/bin/env node
import dotenv from 'dotenv';
import {existsSync} from 'node:fs';
const envPath = new URL('../.env', import.meta.url);
dotenv.config({path:envPath,quiet:true});
const errors=[];
if(Number(process.versions.node.split('.')[0])!==22)errors.push('Use the private Node 22 runtime: run ./install.sh.');
if(!existsSync(envPath))errors.push('Missing .env. Run ./install.sh to create the template.');
if(!/^mongodb(?:\+srv)?:\/\//.test(process.env.MONGODB_URI||''))errors.push('Set MONGODB_URI in .env to your Atlas URI.');
const production=process.env.NODE_ENV==='production';
const expected=production?'codin':'test';
if(process.env.MONGODB_DB_NAME!==expected)errors.push(`Use MONGODB_DB_NAME=${expected} for ${production?'production':'development'}.`);
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1024||port>65535)errors.push('PORT must be an integer from 1024 to 65535.');
let url;
try{url=new URL(process.env.APP_URL||`http://localhost:${port}`);if(!['http:','https:'].includes(url.protocol))throw new Error();}catch{errors.push('Set APP_URL to http://localhost:3000 locally, or your public HTTPS address in production.');}
if(production&&url?.protocol!=='https:')errors.push('Production APP_URL must use HTTPS behind the reverse proxy.');
if(!production&&process.env.OUTBOUND_ENABLED==='true')errors.push('Use OUTBOUND_ENABLED=false for development.');
if(errors.length){console.error(errors.map(x=>`• ${x}`).join('\n'));process.exitCode=1;}
else if(process.argv.includes('--port-only'))console.log(port);
else console.log(`Configuration OK: ${production?'production':'development'}, Atlas database ${expected}, port ${port}. Credentials are not displayed.`);
