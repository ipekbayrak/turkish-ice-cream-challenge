"""Run only the app's debug encounter suite; preserve its existing save data."""
import argparse,json,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--serial',required=True);p.add_argument('--output',required=True);args=p.parse_args()
adb=str(Path.home()/'Library/Android/sdk/platform-tools/adb');package='tr.com.ipekbayrak.turkishicecream.debug';out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
def run(*command):return subprocess.run([adb,'-s',args.serial,*command],check=True,capture_output=True,text=True,timeout=30).stdout
assert run('shell','getprop','ro.kernel.qemu').strip()!='1','Physical device required'
if 'isKeyguardShowing=true' in run('shell','dumpsys','window'):
 raise SystemExit('Phone is locked; unlock it before starting the encounter suite.')
model=run('shell','getprop','ro.product.marketname').strip();android=run('shell','getprop','ro.build.version.release').strip()
run('shell','am','force-stop',package);run('shell','am','start','-n',package+'/tr.com.ipekbayrak.turkishicecream.MainActivity','--ez','maras_soak','true')
time.sleep(2);pid=run('shell','pidof',package).strip().split()[0];seen=0;began=time.monotonic()
while time.monotonic()-began<1200:
 logs=run('logcat','-d','--pid='+pid,'-v','brief','-s','Capacitor/Console:I','chromium:E');(out/'console.log').write_text(logs)
 rows=[];summary=None
 for line in logs.splitlines():
  if 'MARAS_ENCOUNTER_CASE ' in line:rows.append(json.loads(line.split('MARAS_ENCOUNTER_CASE ',1)[1]))
  if 'MARAS_ENCOUNTER_DONE ' in line:summary=json.loads(line.split('MARAS_ENCOUNTER_DONE ',1)[1])
 if len(rows)>seen:
  for row in rows[seen:]:print(json.dumps({k:row[k] for k in ['id','vendor','count','ok','seconds']}) ,flush=True)
  seen=len(rows);(out/'cases.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
 if summary:
  result={'physicalPhone':True,'model':model,'android':android,'summary':summary,'cases':rows};(out/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('NATIVE_DONE '+json.dumps(summary),flush=True);raise SystemExit(0 if summary['failed']==0 and len(rows)==summary['total'] else 1)
 time.sleep(4)
raise SystemExit('No native completion report; inspect console.log')
