"""Read-only device counters plus debug-app benchmark intents. No save reset."""
import argparse,json,re,subprocess,time
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--serial',required=True);p.add_argument('--output',required=True);p.add_argument('--resume-first',action='store_true');p.add_argument('--long-seconds',type=int,default=600);p.add_argument('--counts',type=int,nargs='+',choices=[2,4,8],default=[2,4,8])
args=p.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
adb=str(Path.home()/'Library/Android/sdk/platform-tools/adb');package='tr.com.ipekbayrak.turkishicecream.debug'
def run(*command):
    return subprocess.run([adb,'-s',args.serial,*command],capture_output=True,text=True,timeout=20,check=True).stdout
if run('shell','getprop','ro.kernel.qemu').strip()=='1':raise SystemExit('Physical phone required; emulator is not a phone result.')
model=run('shell','getprop','ro.product.marketname').strip();android=run('shell','getprop','ro.build.version.release').strip()
results=[]
for index,(count,seconds) in enumerate((count,args.long_seconds if count==8 else 60)for count in args.counts):
    if not(index==0 and args.resume_first):
        run('shell','am','force-stop',package)
        run('shell','am','start','-n',package+'/tr.com.ipekbayrak.turkishicecream.MainActivity','--ez','maras_soak','true','--ei','soak_scoops',str(count),'--ei','soak_seconds',str(seconds))
        time.sleep(2)
    pid=run('shell','pidof',package).strip().split()[0];started=time.monotonic();next_sample=0;samples=[];seen=0
    while time.monotonic()-started<seconds+90:
        logs=run('logcat','-d','--pid='+pid,'-v','brief','-s','Capacitor/Console:I','chromium:E')
        (out/f'{count}-scoops-console.log').write_text(logs)
        windows=[];done=None
        for line in logs.splitlines():
            for token in ['MARAS_SOAK_WINDOW ','MARAS_SOAK_DONE ']:
                if token in line:
                    data=json.loads(line.split(token,1)[1])
                    if token.endswith('WINDOW '):windows.append(data)
                    else:done=data
        if time.monotonic()>=next_sample:
            mem=run('shell','dumpsys','meminfo',package);thermal=run('shell','dumpsys','thermalservice');battery=run('shell','dumpsys','battery')
            status=re.search(r'Thermal Status: (\d+)',thermal);pss=re.search(r'TOTAL PSS:\s*(\d+)',mem)
            temps=thermal.split('Current temperatures from HAL:')[-1].split('Current cooling devices')[0]
            values={name:float(value) for value,name in re.findall(r'mValue=([\d.]+), mType=\d+, mName=([^,}]+)',temps)}
            bt=re.search(r'^\s*temperature:\s*(\d+)',battery,re.M)
            sample={'elapsed':round(time.monotonic()-started,1),'pssKb':int(pss.group(1))if pss else None,'thermalStatus':int(status.group(1))if status else None,'batteryC':int(bt.group(1))/10 if bt else None,'temperaturesC':values}
            samples.append(sample);next_sample=time.monotonic()+30
            print(json.dumps({'scoops':count,'progress':windows[-1]if windows else None,'device':sample}),flush=True)
        if done:
            gfx=run('shell','dumpsys','gfxinfo',package);(out/f'{count}-scoops-gfx.txt').write_text(gfx)
            result={'scoops':count,'seconds':seconds,'report':done,'windows':windows,'deviceSamples':samples}
            (out/f'{count}-scoops.json').write_text(json.dumps(result,indent=2));results.append(result)
            print('CASE_COMPLETE '+json.dumps({'scoops':count,'seconds':done['seconds'],'rounds':done['rounds']}),flush=True);break
        time.sleep(5)
    else:raise SystemExit(f'No completion report for {count} scoops; inspect device/log.')
(out/'summary.json').write_text(json.dumps({'physicalPhone':True,'model':model,'android':android,'usbConnected':True,'cases':results},indent=2))
print('ALL_CASES_COMPLETE',flush=True)
