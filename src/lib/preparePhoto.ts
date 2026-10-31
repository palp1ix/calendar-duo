const MAX_EDGE=1600;
export function photoSize(width:number,height:number,maxEdge=MAX_EDGE){
 const scale=Math.min(1,maxEdge/Math.max(width,height));return{width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
/** Reduce new uploads on-device. Existing stored originals are never rewritten. */
export async function preparePhoto(file:File):Promise<Blob>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5242880||file.size===0)throw new Error('Нужен JPG, PNG или WebP до 5 МБ.');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  image.src=url;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('Не удалось прочитать фото.');
  const size=photoSize(image.naturalWidth,image.naturalHeight),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  const context=canvas.getContext('2d');if(!context)return file;
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,size.width,size.height);
  const compressed=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.82));
  canvas.width=canvas.height=1;
  // Some browsers fall back to PNG. Use the actual returned MIME and never increase the upload size.
  return compressed&&compressed.size<file.size?compressed:file;
 }catch(error){if(error instanceof Error&&error.message==='Не удалось прочитать фото.')throw error;throw new Error('Не удалось обработать фото. Попробуйте другой JPG, PNG или WebP.')}
 finally{URL.revokeObjectURL(url)}
}
