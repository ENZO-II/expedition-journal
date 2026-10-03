import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
await build({stdin:{contents:'export {default} from "@owlbear-rodeo/sdk";',resolveDir:process.cwd(),sourcefile:'owlbear-sdk-entry.js'},bundle:true,platform:'browser',format:'esm',target:'es2022',outfile:'dist/vendor/obr-sdk.js',minify:true,legalComments:'inline'});
const packages=['@owlbear-rodeo/sdk','events','immer','js-base64','uuid'];
const notices=[];
for(const name of packages){
  const root='node_modules/'+name;
  const info=JSON.parse(await readFile(root+'/package.json','utf8'));
  let license='';for(const file of ['LICENSE','LICENSE.md','LICENSE.txt']){try{license=await readFile(root+'/'+file,'utf8');break;}catch{}}
  if(!license)throw new Error('Missing license for '+name);
  notices.push(name+' '+info.version+'\n'+license.trim());
}
await writeFile('dist/vendor/NOTICE.txt',notices.join('\n\n--------------------\n\n')+'\n');
console.log('Owlbear SDK bundled with dependency licenses.');
