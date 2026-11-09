import { DataTexture, RedFormat, RepeatWrapping, LinearFilter, LinearMipmapLinearFilter } from 'three';

/** Fine churn grain; geometry and flavor color remain unchanged. */
export function createIceBumpTexture() {
  const size=128,data=new Uint8Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const random=Math.sin(x*127.1+y*311.7)*43758.5453;
    const grain=random-Math.floor(random);
    const churn=Math.sin(y*.42+Math.sin(x*.12)*2)*.12;
    data[y*size+x]=Math.round((.40+grain*.32+churn)*255);
  }
  const texture=new DataTexture(data,size,size,RedFormat);
  texture.wrapS=texture.wrapT=RepeatWrapping;texture.magFilter=LinearFilter;
  texture.minFilter=LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}
