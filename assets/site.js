
function showView(v){
  var l=document.getElementById('view-landing'); var a=document.getElementById('view-app');
  if(v==='app' && !a){ window.location.href='https://apertra-trade.github.io/development/workspace.html'; return; }
  if(v!=='app' && !l){ window.location.href='index.html'; return; }
  if(!l || !a){ return; }
  var isApp = v==='app';
  l.classList.toggle('active', !isApp); a.classList.toggle('active', isApp);
  try{ window.scrollTo(0,0); }catch(e){}
}
function showPaneById(id){
  document.querySelectorAll('.app-pane').forEach(function(p){p.classList.remove('active')});
  var pane=document.getElementById('pane-'+id); if(pane) pane.classList.add('active');
  /* Switching sections starts at the top. Without this the old scroll
     position carried over and the new pane's heading landed hidden
     behind the sticky bars (seen on Settings > Security). */
  try{ window.scrollTo(0,0); }catch(e){}
  document.querySelectorAll('.side-nav button').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-pane')===id); });
  var _va=document.getElementById('view-app'); if(_va && !_va.classList.contains('active')) showView('app');
}

/* ---- Landed cost model (illustrative rates, labelled in UI copy as estimates) ---- */
var PRODUCTS={
  maple:{hs:'1702.20', name:'Maple syrup', duty:{us:0, uk:0, nl:0, au:0}, freightPerKg:1.9, fta:{us:'CUSMA eligible',uk:'UK TCA eligible',nl:'CETA eligible',au:'CPTPP eligible'}},
  skincare:{hs:'3304.99', name:'Skincare', duty:{us:0, uk:0, nl:0, au:0}, freightPerKg:3.4, fta:{us:'CUSMA eligible',uk:'UK TCA eligible',nl:'CETA eligible',au:'CPTPP eligible'}},
  parts:{hs:'8483.40', name:'Machinery parts', duty:{us:0.025, uk:0.017, nl:0.017, au:0}, freightPerKg:1.2, fta:{us:'MFN rate applies',uk:'TCA eligible',nl:'CETA eligible',au:'CPTPP eligible'}},
  honey:{hs:'0409.00', name:'Honey', duty:{us:0, uk:0, nl:0, au:0}, freightPerKg:2.1, fta:{us:'CUSMA eligible',uk:'UK TCA eligible',nl:'CETA eligible',au:'CPTPP eligible · biosecurity applies'}}
};
var DEST={us:{label:'United States', freightBase:1450, days:'2 to 4 days by truck'}, uk:{label:'United Kingdom', freightBase:2350, days:'10 to 12 days by ocean'}, nl:{label:'Netherlands', freightBase:2480, days:'11 to 14 days by ocean'}, au:{label:'Australia', freightBase:2900, days:'14 to 21 days by ocean'}};
function money(n){ return 'CAD $' + Math.round(n).toLocaleString('en-CA'); }
function moneyShort(n){ return '$' + Math.round(n).toLocaleString('en-CA'); }
function runCalc(){
  var pKey=document.getElementById('calc-product').value;
  var dKey=document.getElementById('calc-dest').value;
  var terms=document.getElementById('calc-terms').value;
  var value=parseFloat(document.getElementById('calc-value').value);
  var p=PRODUCTS[pKey], d=DEST[dKey];
  document.getElementById('calc-hs').textContent=p.hs;
  var ftaEl=document.getElementById('calc-fta'); ftaEl.textContent=p.fta[dKey];
  document.getElementById('calc-val-label').textContent=money(value);
  var dutyRate=p.duty[dKey];
  var duty = terms==='exw' ? 0 : value*dutyRate;
  var freight = terms==='exw' ? 0 : d.freightBase + value*0.018;
  var brokerage = terms==='exw' ? 0 : 185;
  var insurance = value*0.006;
  var fx = value*0.0075;
  var total = value + duty + freight + brokerage + insurance + fx;
  document.getElementById('calc-total').textContent=moneyShort(total);
  var rows=[
    ['Goods value', value, ''],
    ['Duty ('+(dutyRate*100).toFixed(1)+'%)', duty, 'amber'],
    ['Freight, '+d.days.split(' by')[0], freight, 'blue'],
    ['Brokerage', brokerage, ''],
    ['Insurance + FX', insurance+fx, '']
  ];
  var max=total;
  var html='';
  rows.forEach(function(r){
    var pct = max>0 ? Math.max(2,(r[1]/max)*100) : 0;
    html+='<div class="bar-row"><span class="lbl">'+r[0]+'</span><span class="bar-track"><span class="bar-fill '+r[2]+'" style="width:'+pct+'%"></span></span><span class="val">'+moneyShort(r[1])+'</span></div>';
  });
  document.getElementById('calc-bars').innerHTML=html;
  var note='';
  if(terms==='exw'){ note='<b>EXW note:</b> Buyer carries freight and duty from your gate, so your landed cost is the goods value plus insurance and FX on settlement. Most first-time buyers prefer DAP or DDP, where you quote one final number.'; }
  else if(dutyRate===0){ note='<b>Good news:</b> '+p.name+' enters '+d.label+' at 0% duty under the applicable trade agreement, provided the certificate of origin is filed correctly. Apertra generates it from this same record. Freight estimate uses aggregated rates, '+d.days+'.'; }
  else { note='<b>Watch the duty line:</b> '+p.name+' faces a '+(dutyRate*100).toFixed(1)+'% rate into '+d.label+' on this classification. That is exactly the cost most exporters discover after quoting. Apertra flags it before the quote goes out.'; }
  document.getElementById('calc-note').innerHTML=note;
}
/* ---- Wiring: all controls are bound here, no inline handlers ---- */
document.querySelectorAll('[data-view]').forEach(function(el){
  el.addEventListener('click', function(ev){ ev.preventDefault(); showView(el.getAttribute('data-view')); });
});
document.querySelectorAll('.side-nav button[data-pane]').forEach(function(b){
  b.addEventListener('click', function(){ showPaneById(b.getAttribute('data-pane')); });
});
document.querySelectorAll('[data-pane-link]').forEach(function(el){
  el.addEventListener('click', function(ev){ ev.preventDefault(); showPaneById(el.getAttribute('data-pane-link')); });
});
document.querySelectorAll('a.dl').forEach(function(a){
  a.addEventListener('click', function(ev){ ev.preventDefault(); });
});
['calc-product','calc-dest','calc-terms'].forEach(function(id){
  document.getElementById(id).addEventListener('change', runCalc);
});
document.getElementById('calc-value').addEventListener('input', runCalc);

/* ---- Trade Network: filter, search, connect, requests ---- */
var netFilter='all';
function applyNetFilter(){
  var q=(document.getElementById('net-search').value||'').trim().toLowerCase();
  var visible=0;
  document.querySelectorAll('#net-grid .net-card').forEach(function(card){
    var roleOk = netFilter==='all' ? true : netFilter==='connected' ? card.getAttribute('data-connected')==='1' : card.getAttribute('data-role')===netFilter;
    var hay=(card.getAttribute('data-search')||'')+' '+(card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '');
    var searchOk = !q || hay.indexOf(q)!==-1;
    var show = roleOk && searchOk;
    card.style.display = show ? '' : 'none';
    if(show) visible++;
  });
  document.getElementById('net-empty').style.display = visible===0 ? 'block' : 'none';
}
document.querySelectorAll('[data-net-filter]').forEach(function(b){
  b.addEventListener('click', function(){
    netFilter=b.getAttribute('data-net-filter');
    document.querySelectorAll('[data-net-filter]').forEach(function(x){ x.classList.toggle('active', x===b); });
    applyNetFilter();
  });
});
document.getElementById('net-search').addEventListener('input', applyNetFilter);
document.querySelectorAll('[data-connect]').forEach(function(btn){
  btn.addEventListener('click', function(){
    btn.textContent='Request sent';
    btn.classList.remove('btn-primary'); btn.classList.add('btn-sent');
    btn.disabled=true;
    var card=btn.closest('.net-card'); var cid=card?card.getAttribute('data-company'):null;
    if(cid && typeof CO_STATE!=='undefined'){ CO_STATE[cid]='sent'; card.setAttribute('data-connected','0'); }
  });
});
function refreshReqCount(){
  var rows=document.querySelectorAll('#net-requests [data-request]');
  document.getElementById('net-req-count').textContent=String(rows.length);
  document.getElementById('net-req-empty').style.display = rows.length===0 ? 'block' : 'none';
}
document.querySelectorAll('[data-req-accept]').forEach(function(btn){
  btn.addEventListener('click', function(){
    var row=btn.closest('[data-request]'); if(!row) return;
    var actions=row.querySelector('.req-actions');
    actions.innerHTML='<span class="status st-green">Connected</span>';
    var count=document.getElementById('net-conn-count');
    count.textContent=String(parseInt(count.textContent,10)+1);
    var cid=row.getAttribute('data-company');
    if(cid && typeof CO_STATE!=='undefined') CO_STATE[cid]='connected';
    row.removeAttribute('data-request');
    refreshReqCount();
  });
});
document.querySelectorAll('[data-req-decline]').forEach(function(btn){
  btn.addEventListener('click', function(){
    var row=btn.closest('[data-request]');
    if(row){ var cid=row.getAttribute('data-company'); if(cid && typeof CO_STATE!=='undefined') CO_STATE[cid]='declined'; row.remove(); }
    refreshReqCount();
  });
});
document.getElementById('net-invite-btn').addEventListener('click', function(){
  var m=document.getElementById('pinvite-modal'); if(m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); }
});
document.querySelectorAll('[data-goto-network]').forEach(function(el){
  el.addEventListener('click', function(){ showPaneById('network'); });
});

/* Deep link: #workspace opens the workspace directly, and the hash
   follows view switches so a reload keeps the reader where they were. */
function viewFromHash(){ try{ return window.location.hash==='#workspace' ? 'app' : 'landing'; }catch(e){ return 'landing'; } }
window.addEventListener('hashchange', function(){ showView(viewFromHash()); });
if(viewFromHash()==='app'){ showView('app'); }

/* ---- Company profile previews ---- */
var CO_STATE={greatlakes:'connected',demarkt:'connected',borough:'connected',prairie:'connected',harbour:'matched',pacific:'matched',coastal:'matched',alpine:'matched',midwest:'request',sakura:'request',northwind:'self'};
var COMPANIES={
  northwind:{name:'Northwind Foods Co.',role:'Exporter',roleClass:'green',loc:'Toronto, Canada',cover:'assets/img-02.jpg',coverAlt:'Workers preparing palletised export shipments inside the Northwind Foods warehouse in Toronto',statusLine:'Your company · This is the profile your partners see',about:'Toronto specialty food exporter and the account you are signed in as. Northwind ships maple syrup, wildflower honey, and pantry gift sets to buyers and importers in the US, UK and Netherlands, with every SKU classified and its compliance record kept on Apertra.',facts:[['Based','Toronto, Canada'],['Verified','Identity, banking, trade refs · 2025'],['Catalogue','4 SKUs classified'],['Corridors','CA-US · CA-UK · CA-NL · CA-AU'],['Trade volume YTD','$412,800 CAD'],['Compliance health','92% · 1 label item open']],prodsTitle:'What Northwind sells',prods:[['assets/img-13.jpg','Maple syrup, 500 ml','Grade A Amber, your best seller across all three corridors','HS 1702.20 · 0% duty US / EU / UK'],['assets/img-14.jpg','Wildflower honey, 340 g','Raw and unfiltered, the lead line for your EU accounts','HS 0409.00 · 0% duty US / EU / UK'],['assets/img-15.jpg','Pantry gift sets and maple mustard','Seasonal gift sets plus the new mustard line, in broker review','HS Mixed · 2103.30']],checks:['Business identity and registration verified','Banking details confirmed for escrow settlement','HS classifications kept with reasoning, 7-year audit trail','Two trade references checked'],relTitle:'How partners see you',rel:[['Reputation','Pays and ships on schedule','14 orders completed on rails'],['Response time','Replies to connection requests within 1 business day','Network average'],['Open item','US nutrition label revision in progress for AP-2041','Visible to Great Lakes Grocery']],footNote:'Partners see this same profile, including the open label item. Nothing here is hidden from a connected counterparty.'},
  greatlakes:{name:'Great Lakes Grocery',role:'Buyer',roleClass:'amber',loc:'Chicago, United States',cover:'assets/img-05.jpg',coverAlt:'Inside Great Lakes Grocery, produce aisles and stocked shelves in Chicago',statusLine:'Connected since March 2026 · 14 orders on rails',about:'Regional grocery buyer in Chicago and your largest account. Great Lakes stocks Canadian pantry lines across its stores, orders maple syrup and gift sets on a steady cycle, and funds escrow before every shipment leaves Toronto.',facts:[['Based','Chicago, US'],['Verified','November 2025, renewed 2026'],['Orders on rails','14 completed'],['Payment behaviour','Pays 2 days after clearance, average'],['Escrow history','Clean, no disputes'],['Corridor','Toronto to Chicago, truck']],prodsTitle:'What they buy from you',prods:[['assets/img-13.jpg','Maple syrup, 500 ml','Their top Canadian line, reordered roughly monthly','HS 1702.20 · CUSMA 0%'],['assets/img-15.jpg','Pantry gift sets','Seasonal sets for the winter and holiday shelves','HS Mixed · By component'],['assets/img-14.jpg','Wildflower honey, 340 g','Second pantry line, added in the autumn order','HS 0409.00 · CUSMA 0%']],checks:['Business identity and registration verified','Credit checked, escrow funded on all 14 orders','Banking details confirmed','Trade references checked'],relTitle:'Your trade history together',rel:[['AP-2041 · Maple syrup, 1,200 cases','Escrow funded · Waiting on your revised US label','$48,200'],['AP-2031 · Maple syrup, 900 cases','Delivered · Cleared Nov 8 · Paid Nov 10','$36,400'],['Next order','Expected early December, seasonal gift sets','Forecast']],footNote:'Contact details and the shared shipment record are open to both sides because you are connected.'},
  demarkt:{name:'De Markt BV',role:'Importer',roleClass:'blue',loc:'Rotterdam, Netherlands',cover:'assets/img-06.jpg',coverAlt:'Inside the De Markt BV food distribution warehouse near Rotterdam, forklift moving palletised produce',statusLine:'Connected since June 2026 · 6 orders on rails',about:'Food importer and distributor, and importer of record for the Netherlands. De Markt was your first EU account, is honey-led, is growing about 30% quarter on quarter, and has introduced two other Dutch buyers to your range.',facts:[['Based','Rotterdam, Netherlands'],['Verified','May 2026'],['Role','Importer of record, NL'],['Orders on rails','6 completed'],['Growth','About 30% quarter on quarter'],['Corridor','Toronto to Rotterdam, ocean']],prodsTitle:'What they import and distribute',prods:[['assets/img-14.jpg','Wildflower honey, 340 g','Their lead Canadian line, distributed to Dutch retailers','HS 0409.00 · CPTPP 0%'],['assets/img-13.jpg','Maple syrup, 500 ml','Second line, added after the first honey orders cleared','HS 1702.20 · CPTPP 0%'],['assets/img-15.jpg','Pantry gift sets','Under review for spring listings in the Netherlands','HS Mixed · By component']],checks:['Business identity and registration verified','Importer of record status confirmed for NL','CETA documentation handled on the shared record','Banking details confirmed for escrow settlement'],relTitle:'Your trade history together',rel:[['AP-2038 · Honey jars, 800 cases','In transit · Pre-lodged with EU customs · Escrow funded','$31,600'],['Introductions','Has introduced two other Dutch buyers to your range','Network'],['Documentation','Certificates of origin shared on one record','CETA']],footNote:'Contact details and the shared shipment record are open to both sides because you are connected.'},
  borough:{name:'Borough Pantry',role:'Buyer',roleClass:'amber',loc:'London, United Kingdom',cover:'assets/img-07.jpg',coverAlt:'Inside Borough Pantry, a small London grocery shop with stocked shelves and fresh produce',statusLine:'Connected since September 2026 · 3 orders so far',about:'London retail buyer specialising in gift sets, with strong December seasonality. Borough Pantry reorders roughly every six weeks and already claims UK TCA preference on your shipments.',facts:[['Based','London, UK'],['Verified','August 2026'],['Orders on rails','3 completed'],['Reorder cycle','Roughly every 6 weeks'],['Seasonality','Strong December peak'],['Corridor','Montreal to London, ocean']],prodsTitle:'What they buy from you',prods:[['assets/img-15.jpg','Pantry gift sets','Their core line, built around the December season','HS Mixed · UK TCA claimed'],['assets/img-13.jpg','Maple syrup, 500 ml','Sold inside the gift sets and as a standalone bottle','HS 1702.20 · TCA 0%'],['assets/img-14.jpg','Wildflower honey, 340 g','Smaller line, stocked alongside the sets','HS 0409.00 · TCA 0%']],checks:['Business identity and registration verified','UK TCA preference already claimed and recorded','Banking details confirmed','Trade references checked'],relTitle:'Your trade history together',rel:[['AP-2035 · Pantry gift sets, 450 units','Cleared Nov 16 · Escrow releasing Nov 18','$22,900'],['Pattern','Three orders since September, each larger than the last','Growing'],['Next order','December seasonal sets, expected shortly','Forecast']],footNote:'Contact details and the shared shipment record are open to both sides because you are connected.'},
  prairie:{name:'Prairie Grains Co.',role:'Exporter',roleClass:'green',loc:'Saskatoon, Canada',cover:'assets/img-08.jpg',coverAlt:'Prairie Grains Co. grain silos standing in a harvested wheat field near Saskatoon',statusLine:'Connected since May 2026 · Fellow exporter',about:'Fellow Canadian exporter of grains and pulses out of Saskatoon. Prairie Grains shares your Chicago freight lane: you split a consolidated truck in October and both saved on the lane rate. They also introduced you to Great Lakes Grocery.',facts:[['Based','Saskatoon, Canada'],['Verified','April 2026'],['Ships','Grains and pulses'],['Shared lane','CA to US Midwest, truck'],['Joint saving','Consolidated truck, October'],['Introductions','Introduced you to Great Lakes Grocery']],prodsTitle:'What they export',prods:[['assets/img-16.jpg','Lentils, chickpeas and pulses','Bulk and bagged pulses, their core export range','Prairie grown'],['assets/img-16.jpg','Wheat and grain lines','Milled and whole grain lines for US Midwest buyers','Seasonal harvest'],['assets/img-16.jpg','Co-packed dry goods','Shared co-packing capacity other exporters can book','Network partner']],checks:['Business identity and registration verified','Export history on rails since May 2026','Banking details confirmed','Trade references checked'],relTitle:'How you work together',rel:[['October consolidation','Split a truck to Chicago, both sides saved on the lane rate','Shared freight'],['Introductions','Their introduction led to your largest account','Great Lakes Grocery'],['Next step','Another shared lane is suggested when your December order firms up','Suggested']],footNote:'Exporter to exporter: you see each other\'s lanes and capacity, not each other\'s buyers or prices.'},
  harbour:{name:'Harbour Pantry',role:'Buyer',roleClass:'amber',loc:'Sydney, Australia',cover:'assets/img-09.jpg',coverAlt:'The deli counter at Harbour Pantry in Sydney, stocked with cheeses, cured meats and preserves',statusLine:'Matched for you · 96% match on product and corridor',about:'Specialty food distributor in Sydney building its spring listings. Harbour Pantry is looking for Canadian pantry brands and matched on your honey and mustard lines. Before a first order, your Australian labelling and biosecurity review runs through the compliance gatekeeper.',facts:[['Based','Sydney, Australia'],['Verified','October 2026'],['Match','96% · Product + corridor'],['Projected first order','$18K to $25K'],['Looking for','Canadian pantry brands, spring listings'],['Needs first','Australian labelling + biosecurity review, gatekeeper ready']],prodsTitle:'What they want to stock',prods:[['assets/img-14.jpg','Wildflower honey, 340 g','The line that drove the match, for spring listings','HS 0409.00 · CPTPP 0%'],['assets/img-15.jpg','Maple mustard, 250 ml','Second matched line, pending your broker review','HS 2103.30 · In review'],['assets/img-13.jpg','Maple syrup, 500 ml','Also carried in their imported pantry range','HS 1702.20 · CPTPP 0%']],checks:['Business identity and registration verified','Banking details confirmed for escrow','Trade references checked','Compliance status for Australia visible before you commit'],relTitle:'Why you were matched',rel:[['Product fit','Your honey and mustard lines match their spring listing brief','96%'],['Corridor fit','Toronto to Sydney is an open CPTPP lane on your plan','CPTPP'],['Order size','Their projected first order sits inside your normal range','$18K to $25K']],footNote:'Preview only. Contact details are shared after both sides accept a connection.'},
  pacific:{name:'Pacific Rim Imports',role:'Importer',roleClass:'blue',loc:'Los Angeles, United States',cover:'assets/img-10.jpg',coverAlt:'Inside the Pacific Rim Imports distribution warehouse in Los Angeles, aisles of palletised stock',statusLine:'Matched for you · 93% match, new market',about:'Importer of record for West Coast grocery, bringing Canadian specialty foods into more than 40 stores. Pacific Rim would be your importer of record for a first California order, and their FDA facility registration is already on file.',facts:[['Based','Los Angeles, US'],['Verified','September 2026'],['Match','93% · New market'],['Reach','40+ West Coast stores'],['Typical first order','$20K to $35K'],['FDA','Facility registration already on file']],prodsTitle:'What they import',prods:[['assets/img-13.jpg','Maple syrup, 500 ml','Core Canadian line for their grocery customers','HS 1702.20 · CUSMA 0%'],['assets/img-14.jpg','Wildflower honey, 340 g','Second Canadian line in their specialty range','HS 0409.00 · CUSMA 0%'],['assets/img-15.jpg','Pantry gift sets','Seasonal imports for West Coast retailers','HS Mixed · By component']],checks:['Business identity and registration verified','Importer of record status confirmed for the US','FDA facility registration on file','Banking details confirmed for escrow'],relTitle:'Why you were matched',rel:[['New market','A first California route without vetting an importer from scratch','93%'],['Readiness','FDA registration on file shortens your first shipment setup','FDA'],['Order size','Typical first orders match your production runs','$20K to $35K']],footNote:'Preview only. Contact details are shared after both sides accept a connection.'},
  coastal:{name:'Coastal Catch Seafood',role:'Exporter',roleClass:'green',loc:'Halifax, Canada',cover:'assets/img-11.jpg',coverAlt:'A worker at Coastal Catch Seafood in Halifax holding a bin of cooked shrimp in the processing area',statusLine:'Matched for you · 89% match, shared lane',about:'Fellow Canadian exporter of frozen seafood out of Halifax. Coastal Catch ships to Rotterdam monthly on the same ocean lane as your honey, which makes them a candidate for shared reefer consolidation.',facts:[['Based','Halifax, Canada'],['Verified','August 2026'],['Match','89% · Shared lane'],['Ships','Frozen seafood, monthly'],['Shared lane','Halifax to Rotterdam'],['Estimated saving','About 12% if consolidated']],prodsTitle:'What they export',prods:[['assets/img-17.jpg','Frozen salmon portions','Vacuum packed fillets, their core export line','Frozen · Reefer'],['assets/img-17.jpg','Cooked shrimp','Processed in Halifax for EU retail programmes','Frozen · Reefer'],['assets/img-17.jpg','Atlantic white fish','Seasonal lines shipped on the Rotterdam lane','Frozen · Reefer']],checks:['Business identity and registration verified','Export history visible on the network','Cold chain handling on their profile','Trade references checked'],relTitle:'Why you were matched',rel:[['Shared lane','Your honey and their seafood both sail Halifax to Rotterdam','Lane match'],['Consolidation','A shared reefer could cut both freight bills by about 12%','About 12%'],['Cadence','They ship monthly, close to your EU rhythm','Monthly']],footNote:'Preview only. Freight lanes and capacity are visible; buyers and prices are not shared between exporters.'},
  alpine:{name:'Alpine Provisions',role:'Buyer',roleClass:'amber',loc:'Denver, United States',cover:'assets/img-12.jpg',coverAlt:'Inside an Alpine Provisions natural foods store in Denver, wooden shelves of pantry goods',statusLine:'Matched for you · 91% match on product fit',about:'Natural foods buyer with 9 stores in Denver, building a Canadian pantry set for the winter season. Alpine matched on maple syrup, with CUSMA duty at 0%, and wants DDP pricing, which your landed cost calculator already supports.',facts:[['Based','Denver, US'],['Verified','October 2026'],['Match','91% · Product fit'],['Stores','9 natural foods stores'],['Projected first order','$12K to $18K'],['Pricing wanted','DDP, duties paid to their door']],prodsTitle:'What they want to stock',prods:[['assets/img-13.jpg','Maple syrup, 500 ml','The anchor of the Canadian pantry set they are building','HS 1702.20 · CUSMA 0%'],['assets/img-14.jpg','Wildflower honey, 340 g','Second line under consideration for the same set','HS 0409.00 · CUSMA 0%'],['assets/img-15.jpg','Pantry gift sets','Winter seasonal sets for their 9 stores','HS Mixed · By component']],checks:['Business identity and registration verified','Banking details confirmed for escrow','Trade references checked','Credit checked before first order'],relTitle:'Why you were matched',rel:[['Product fit','Maple syrup leads the winter set they are building','91%'],['Terms fit','They want DDP, and your calculator already quotes it','DDP'],['Order size','Projected first order fits a single truck shipment','$12K to $18K']],footNote:'Preview only. Contact details are shared after both sides accept a connection.'},
  midwest:{name:'Midwest Natural Foods',role:'Buyer',roleClass:'amber',loc:'Chicago, United States',cover:'assets/img-03.jpg',coverAlt:'Inside a Midwest Natural Foods store, aisles of natural and organic products',statusLine:'Connection request · Waiting on your reply',about:'Chicago natural foods buyer that found you through your HS 1702.20 listing. Midwest wants maple syrup and honey for 22 stores. Review the full profile before you accept: once connected, contact details open on both sides and they can appear in your shipment flow.',facts:[['Based','Chicago, US'],['Verified','November 2026'],['Stores','22 stores'],['Wants','Maple syrup and honey'],['Found you via','Your HS 1702.20 listing'],['Corridor','Toronto to Chicago, truck']],prodsTitle:'What they want to buy',prods:[['assets/img-13.jpg','Maple syrup, 500 ml','The listing they found you through','HS 1702.20 · CUSMA 0%'],['assets/img-14.jpg','Wildflower honey, 340 g','Second line named in their request','HS 0409.00 · CUSMA 0%'],['assets/img-15.jpg','Pantry gift sets','Not requested yet, visible on your catalogue','HS Mixed · By component']],checks:['Business identity and registration verified','Banking details confirmed for escrow','Trade references checked','Credit check completed November 2026'],relTitle:'Before you accept',rel:[['What happens next','Accepting opens contact details and adds them to your shipment buyer list','Step 1'],['Payment protection','Their first order still funds escrow before you ship','Escrow'],['No obligation','Accepting a connection is not accepting an order','You decide']],footNote:'This is the full preview your team sees before accepting a connection request.'},
  sakura:{name:'Sakura Trading Co.',role:'Importer',roleClass:'blue',loc:'Osaka, Japan',cover:'assets/img-04.jpg',coverAlt:'Inside a Sakura Trading Co. partner grocery store in Osaka, Japan',statusLine:'Connection request · Waiting on your reply',about:'Importer of record for Canadian specialty foods into Japan. Sakura would open a market with no free trade rate on honey, and that duty is shown upfront on their profile rather than discovered after a quote. Review the full profile before you accept.',facts:[['Based','Osaka, Japan'],['Verified','October 2026'],['Role','Importer of record, Japan'],['Wants','Canadian specialty foods'],['Watch item','Japan has no FTA rate on honey, duty shown upfront'],['Corridor','Toronto to Osaka, ocean']],prodsTitle:'What they import',prods:[['assets/img-14.jpg','Wildflower honey, 340 g','Named in their request, with the Japan duty flagged','HS 0409.00 · No FTA rate'],['assets/img-13.jpg','Maple syrup, 500 ml','Second Canadian line in their specialty range','HS 1702.20 · Duty applies'],['assets/img-15.jpg','Pantry gift sets','Seasonal lines for Japanese retail partners','HS Mixed · By component']],checks:['Business identity and registration verified','Importer of record status confirmed for Japan','Banking details confirmed for escrow','Trade references checked'],relTitle:'Before you accept',rel:[['What happens next','Accepting opens contact details and adds them to your shipment buyer list','Step 1'],['Duty honesty','Japan rates are shown on the profile and in the calculator','Upfront'],['No obligation','Accepting a connection is not accepting an order','You decide']],footNote:'This is the full preview your team sees before accepting a connection request.'}
};
var coCurrent=null;
function coStatusTag(id){
  var st=CO_STATE[id];
  if(st==='connected') return '<span class="tag green">Connected</span>';
  if(st==='request') return '<span class="tag blue">Request pending</span>';
  if(st==='sent') return '<span class="tag">Request sent</span>';
  if(st==='self') return '<span class="tag green">Your company</span>';
  return '<span class="tag">Matched for you</span>';
}
function openCompany(id){
  var c=COMPANIES[id]; if(!c) return;
  coCurrent=id;
  var cover=document.getElementById('co-cover'); cover.src=c.cover; cover.alt=c.coverAlt;
  document.getElementById('co-tags').innerHTML='<span class="tag '+c.roleClass+'">'+c.role+'</span> '+coStatusTag(id);
  document.getElementById('co-name').textContent=c.name;
  document.getElementById('co-meta').textContent=c.loc+' · '+c.statusLine;
  document.getElementById('co-about').textContent=c.about;
  document.getElementById('co-facts').innerHTML=c.facts.map(function(f){return '<div class="co-fact"><span>'+f[0]+'</span><b>'+f[1]+'</b></div>';}).join('');
  document.getElementById('co-prods-title').textContent=c.prodsTitle;
  document.getElementById('co-prods').innerHTML=c.prods.map(function(p){return '<div class="co-prod"><img src="'+p[0]+'" alt="'+p[1]+' at '+c.name+'"><div><b>'+p[1]+'</b><span>'+p[2]+'</span><span class="mono">'+p[3]+'</span></div></div>';}).join('');
  document.getElementById('co-checks').innerHTML=c.checks.map(function(t){return '<div class="check-item"><span class="check-ic ci-done">✓</span><div><b style="font-size:14px">'+t+'</b></div></div>';}).join('');
  document.getElementById('co-rel-title').textContent=c.relTitle;
  document.getElementById('co-rel').innerHTML=c.rel.map(function(r){return '<div><div><b>'+r[0]+'</b><small>'+r[1]+'</small></div><span class="num">'+r[2]+'</span></div>';}).join('');
  document.getElementById('co-foot-note').textContent=c.footNote;
  renderCoFoot(id);
  var m=document.getElementById('co-modal'); m.classList.add('open'); m.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  var body=m.querySelector('.co-body'); if(body) body.scrollTop=0;
}
function renderCoFoot(id){
  var st=CO_STATE[id], box=document.getElementById('co-foot-actions'), html='';
  var inWizard=['greatlakes','demarkt','borough','midwest','pacific','harbour'].indexOf(id)!==-1;
  if(st==='connected'){
    if(inWizard) html+='<button type="button" class="btn btn-primary" data-co-act="ship">Create shipment for their request</button>';
    html+='<button type="button" class="btn btn-ghost" data-co-act="trades">View trades</button>';
  } else if(st==='matched'){
    html+='<button type="button" class="btn btn-primary" data-co-act="connect">Connect</button>';
  } else if(st==='sent'){
    html+='<button type="button" class="btn btn-sent" disabled>Request sent</button>';
  } else if(st==='request'){
    html+='<button type="button" class="btn btn-primary" data-co-act="accept">Accept request</button><button type="button" class="btn btn-ghost" data-co-act="decline">Decline</button>';
  } else if(st==='self'){
    html+='<button type="button" class="btn btn-ghost" data-co-act="close">Close preview</button>';
  }
  box.innerHTML=html;
  box.querySelectorAll('[data-co-act]').forEach(function(b){
    b.addEventListener('click', function(){
      var act=b.getAttribute('data-co-act');
      if(act==='close'){ closeCompany(); }
      else if(act==='trades'){ closeCompany(); showPaneById('shipments'); }
      else if(act==='ship'){
        closeCompany();
        var reqBtn=null;
        document.querySelectorAll('#incoming-req-tbody .inc-create[data-buyer="'+id+'"]').forEach(function(x){ if(!reqBtn&&!x.disabled) reqBtn=x; });
        if(reqBtn){ reqBtn.click(); }
        else shipToast((COMPANIES[id]?COMPANIES[id].name:'This partner')+' has no open buy request to you. Shipments start from funded buy requests, so there is nothing to create yet.');
      }
      else if(act==='connect'){ var card=document.querySelector('.net-card[data-company="'+id+'"]'); var cb=card?card.querySelector('[data-connect]'):null; if(cb && !cb.disabled) cb.click(); renderCoFoot(id); document.getElementById('co-tags').innerHTML='<span class="tag '+COMPANIES[id].roleClass+'">'+COMPANIES[id].role+'</span> '+coStatusTag(id); }
      else if(act==='accept'){ var row=document.querySelector('.req-row[data-company="'+id+'"]'); var ab=row?row.querySelector('[data-req-accept]'):null; if(ab) ab.click(); renderCoFoot(id); document.getElementById('co-tags').innerHTML='<span class="tag '+COMPANIES[id].roleClass+'">'+COMPANIES[id].role+'</span> '+coStatusTag(id); }
      else if(act==='decline'){ var row2=document.querySelector('.req-row[data-company="'+id+'"]'); var db=row2?row2.querySelector('[data-req-decline]'):null; if(db) db.click(); closeCompany(); }
    });
  });
}
function closeCompany(){
  var m=document.getElementById('co-modal'); m.classList.remove('open'); m.setAttribute('aria-hidden','true');
  if(!document.getElementById('ship-modal').classList.contains('open')) document.body.style.overflow='';
}
document.querySelectorAll('[data-company-preview]').forEach(function(el){
  el.addEventListener('click', function(ev){ ev.preventDefault(); openCompany(el.getAttribute('data-company-preview')); });
});
document.querySelectorAll('[data-close-co]').forEach(function(el){ el.addEventListener('click', closeCompany); });
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeCompany(); });
function updateShipPartnerPreview(){
  var sel=document.getElementById('ship-buyer'); if(!sel) return;
  var id=sel.value; var c=COMPANIES[id]; if(!c) return;
  document.getElementById('spp-img').src=c.cover;
  document.getElementById('spp-img').alt=c.coverAlt;
  document.getElementById('spp-name').textContent=c.name;
  document.getElementById('spp-meta').textContent=c.loc+' · '+c.statusLine;
  document.getElementById('spp-line').textContent=c.rel[0][0]+' · '+c.rel[0][2];
}
document.getElementById('spp-btn').addEventListener('click', function(){ openCompany(document.getElementById('ship-buyer').value); });
document.getElementById('ship-buyer').addEventListener('change', updateShipPartnerPreview);

/* ---- Partner delivery locations and own ship-from locations ----
   Locations live on each partner's profile. The wizard pre-fills from
   them: the buyer is locked when you start from their profile, the
   delivery location is a picker only when they have more than one,
   and origin is pre-filled with your default ship-from location. */
var PARTNER_LOCS={
  greatlakes:[{label:'Chicago, IL · Distribution centre',dest:'us',city:'Chicago'},{label:'Milwaukee, WI · Store hub',dest:'us',city:'Milwaukee'}],
  demarkt:[{label:'Rotterdam, Netherlands · Warehouse',dest:'nl',city:'Rotterdam'}],
  borough:[{label:'London, UK · Store and stockroom',dest:'uk',city:'London'}],
  midwest:[{label:'Chicago, IL · Distribution centre',dest:'us',city:'Chicago'}],
  pacific:[{label:'Los Angeles, CA · Warehouse',dest:'us',city:'Los Angeles'},{label:'Seattle, WA · Store hub',dest:'us',city:'Seattle'}],
  harbour:[{label:'Sydney, Australia · Warehouse',dest:'au',city:'Sydney'}]
};
var MY_LOCS=[
  {city:'Toronto',label:'Toronto, Canada · Head office and warehouse (default)'},
  {city:'Ottawa',label:'Ottawa, Canada · Fulfilment centre'},
  {city:'Montreal',label:'Montreal, Canada · Partner 3PL'}
];
var shipRequestRow=null;
var shipRequestFreight='', shipRequestWanted='';
function currentShipLoc(){
  var sel=document.getElementById('ship-buyer'); if(!sel) return null;
  var locs=PARTNER_LOCS[sel.value]||[];
  if(!locs.length) return null;
  var ls=document.getElementById('ship-loc-select');
  var idx=(ls && ls.style.display!=='none') ? (parseInt(ls.value,10)||0) : 0;
  return locs[Math.min(idx,locs.length-1)];
}
function applyShipBuyer(){
  var sel=document.getElementById('ship-buyer'); if(!sel) return;
  var locs=PARTNER_LOCS[sel.value]||[];
  var ls=document.getElementById('ship-loc-select'), st=document.getElementById('ship-loc-static'), note=document.getElementById('ship-loc-note');
  if(locs.length>1){
    ls.innerHTML=locs.map(function(l,i){return '<option value="'+i+'">'+l.label+'</option>';}).join('');
    ls.style.display=''; st.style.display='none';
    note.textContent='This partner has '+locs.length+' locations on their profile. Pick where this shipment goes.';
  } else if(locs.length===1){
    ls.style.display='none'; st.style.display='';
    st.innerHTML='<b>'+locs[0].label+'</b> · Their only location on file';
    note.textContent='Taken from the buyer\u2019s profile, so it is always the address they gave Apertra.';
  }
  var loc=currentShipLoc();
  if(loc){ document.getElementById('ship-dest').value=loc.dest; document.getElementById('ship-dest-city').value=loc.city; }
  var destSel=document.getElementById('ship-dest');
  destSel.classList.add('locked-field'); destSel.setAttribute('tabindex','-1'); destSel.setAttribute('aria-readonly','true');
  var destCity=document.getElementById('ship-dest-city');
  destCity.readOnly=true; destCity.classList.add('locked-field');
  updateShipPartnerPreview();
  if(typeof updateShipLive==='function') updateShipLive();
}
function setShipBuyerLock(locked, partnerName){
  var sel=document.getElementById('ship-buyer'); if(!sel) return;
  sel.classList.toggle('locked-field',locked);
  if(locked){ sel.setAttribute('tabindex','-1'); sel.setAttribute('aria-readonly','true'); }
  else { sel.removeAttribute('tabindex'); sel.removeAttribute('aria-readonly'); }
  var un=document.getElementById('ship-buyer-unlock'); if(un) un.style.display=locked?'':'none';
  var note=document.getElementById('ship-buyer-note');
  if(note) note.textContent=locked
    ? 'Pre-filled from '+(partnerName||'this partner')+'\u2019s profile and locked, because you started from their page.'
    : 'Only verified network partners appear here. Need someone new? Invite them from Trade Network first.';
}
function setShipGoodsLock(locked){
  /* On a buyer's request the goods, quantity and price are what the buyer
     asked for and already funded in escrow, so the exporter cannot edit
     them while creating the shipment. Shown full strength, not editable. */
  var prod=shipEl('ship-product');
  prod.classList.toggle('locked-field',locked);
  if(locked){ prod.setAttribute('tabindex','-1'); prod.setAttribute('aria-readonly','true'); }
  else { prod.removeAttribute('tabindex'); prod.removeAttribute('aria-readonly'); }
  shipEl('ship-qty').readOnly=locked;
  shipEl('ship-unit').readOnly=locked;
  shipEl('ship-qty').classList.toggle('locked-field',locked);
  shipEl('ship-unit').classList.toggle('locked-field',locked);
  var note=shipEl('ship-goods-note');
  if(note) note.style.display=locked?'':'none';
}
function shipToast(msg){
  var t=document.getElementById('ws-toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(function(){t.classList.remove('show');},3600);
}
/* ---- Request-only shipment creation ----
   Shipments exist only against funded buy requests. Every "New shipment"
   entry point opens this picker; there is no blank-form path. The list is
   read live from the Requests panel, so a request leaves the picker the
   moment its shipment is created. */
function openShipPicker(){
  var list=shipEl('reqpick-list'), empty=shipEl('reqpick-empty');
  if(!list||!empty) return;
  list.innerHTML='';
  var count=0;
  document.querySelectorAll('#incoming-req-tbody .inc-create').forEach(function(b){
    if(b.disabled) return;
    var tr=b.closest('tr'); if(!tr) return;
    var tds=tr.querySelectorAll('td');
    var co=COMPANIES[b.getAttribute('data-buyer')];
    var row=document.createElement('div'); row.className='reqpick-row';
    var left=document.createElement('div');
    left.innerHTML='<b>'+b.getAttribute('data-req')+' · '+(co?co.name:'Buyer')+'</b><small>'+(tds[2]?tds[2].textContent:'')+' · Wanted by '+(b.getAttribute('data-wanted')||(tds[4]?tds[4].textContent:''))+'</small>';
    var amt=document.createElement('span'); amt.className='num'; amt.textContent='$'+(tds[3]?tds[3].textContent.trim():'')+' escrow';
    var btn=document.createElement('button'); btn.type='button'; btn.className='btn btn-primary inc-create'; btn.textContent='Create shipment';
    ['data-buyer','data-product','data-qty','data-req','data-freight','data-terms','data-wanted'].forEach(function(a){ var v=b.getAttribute(a); if(v) btn.setAttribute(a,v); });
    row.appendChild(left); row.appendChild(amt); row.appendChild(btn);
    list.appendChild(row);
    count++;
  });
  list.style.display=count?'':'none';
  empty.style.display=count?'none':'';
  var m=shipEl('reqpick-modal'); m.classList.add('open'); m.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeShipPicker(){
  var m=shipEl('reqpick-modal'); if(!m) return;
  m.classList.remove('open'); m.setAttribute('aria-hidden','true');
  var wiz=shipEl('ship-modal');
  if(!wiz||!wiz.classList.contains('open')) document.body.style.overflow='';
}
function setShipTermsLock(locked){
  /* Delivery terms are part of the funded deal on a request: who arranges
     and who pays was settled when the buyer funded escrow, so the exporter
     cannot re-pick them in the wizard. */
  var t=shipEl('ship-terms');
  t.classList.toggle('locked-field',locked);
  if(locked){ t.setAttribute('tabindex','-1'); t.setAttribute('aria-readonly','true'); }
  else { t.removeAttribute('tabindex'); t.removeAttribute('aria-readonly'); }
}

/* ---- New Shipment Flow ---- */
var shipStep=1, shipFreight='standard', shipCreated=0, lastCreatedId='';
var SHIP_PROD={
  maple:{label:'Maple syrup, 1,200 cases', short:'Maple syrup', hs:'1702.20', unit:40, weightPer:12, duty:{us:0,nl:0,uk:0,de:0,jp:0.171}, fta:'CUSMA / CETA / TCA eligible'},
  honey:{label:'Honey jars', short:'Wildflower honey', hs:'0409.00', unit:39.50, weightPer:8.5, duty:{us:0,nl:0,uk:0,de:0,jp:0.255}, fta:'CUSMA / CETA / TCA eligible'},
  gift:{label:'Pantry gift sets', short:'Pantry gift set', hs:'Mixed', unit:50.90, weightPer:3.2, duty:{us:0,nl:0,uk:0,de:0,jp:0.05}, fta:'By component, preference claimed'},
  mustard:{label:'Maple mustard', short:'Maple mustard', hs:'2103.30', unit:28, weightPer:6, duty:{us:0,nl:0,uk:0,de:0,jp:0}, fta:'Pending broker review'}
};
var SHIP_DEST={us:{label:'United States', freightBase:1450, days:'2 to 4 days by truck', corridor:'CUSMA corridor'}, nl:{label:'Netherlands (EU)', freightBase:2480, days:'11 to 14 days by ocean', corridor:'CETA corridor'}, uk:{label:'United Kingdom', freightBase:2350, days:'10 to 12 days by ocean', corridor:'UK TCA corridor'}, de:{label:'Germany (EU)', freightBase:2480, days:'11 to 14 days by ocean', corridor:'CETA corridor'}, jp:{label:'Japan', freightBase:3100, days:'14 to 18 days by ocean', corridor:'No FTA corridor'}, au:{label:'Australia', freightBase:2900, days:'14 to 21 days by ocean', corridor:'CPTPP corridor'}};
function shipEl(id){return document.getElementById(id);}
function shipMoney(n){return '$'+Math.round(n).toLocaleString('en-CA');}
function shipGoodsValue(){var q=parseFloat(shipEl('ship-qty').value)||0;var u=parseFloat(shipEl('ship-unit').value)||0;return q*u;}
function shipFreightPrices(){var v=shipGoodsValue();var d=SHIP_DEST[shipEl('ship-dest').value]||SHIP_DEST.us;var base=d.freightBase+v*0.018;return{standard:base,expedited:base*1.6,consolidated:Math.max(650,base*0.82)};}
function shipDutyRate(){var p=SHIP_PROD[shipEl('ship-product').value];var dk=shipEl('ship-dest').value;return (p&&p.duty[dk]!=null)?p.duty[dk]:0;}
function shipTotals(){var goods=shipGoodsValue();var duty=shipEl('ship-terms').value==='EXW'?0:goods*shipDutyRate();var fp=shipFreightPrices();var freight=shipEl('ship-terms').value==='EXW'?0:fp[shipFreight];var brokerage=shipEl('ship-terms').value==='EXW'?0:185;var insurance=goods*0.006;var fx=goods*0.0075;return{goods:goods,duty:duty,freight:freight,brokerage:brokerage,insurance:insurance,fx:fx,total:goods+duty+freight+brokerage+insurance+fx};}
function updateShipLive(){
  var buyerSel=shipEl('ship-buyer');var destKey=shipEl('ship-dest').value;var d=SHIP_DEST[destKey];
  var origin=shipEl('ship-origin').value;var city=shipEl('ship-dest-city').value||'';
  shipEl('ship-route-box').innerHTML='<b>Route ready:</b> '+origin+' → '+city+' · '+d.corridor+' · Typical transit '+d.days+' when documents are pre-lodged.';
  var p=SHIP_PROD[shipEl('ship-product').value];var qty=parseFloat(shipEl('ship-qty').value)||0;var goods=shipGoodsValue();var weight=Math.round(qty*p.weightPer);
  shipEl('ship-goods-box').innerHTML='<b>'+p.short+'</b> · HS <span class="mono">'+p.hs+'</span> · '+p.fta+'<br>Goods value <b>'+shipMoney(goods)+'</b> ('+qty.toLocaleString('en-CA')+' × '+shipMoney(parseFloat(shipEl('ship-unit').value)||0)+') · Est. gross weight '+weight.toLocaleString('en-CA')+' kg · Duty to '+d.label+': <b>'+(shipDutyRate()*100).toFixed(1)+'%</b>';
  var isUS=destKey==='us';var needsLabel=shipEl('ship-label-status').value==='needs';
  var rows='';
  rows+='<div><span class="check-ic ci-done">✓</span><div><b>HS classification confirmed</b><small>'+p.hs+' · '+p.short+' · Reasoning on record</small></div><span class="status st-green">Done</span></div>';
  rows+='<div><span class="check-ic ci-done">✓</span><div><b>Certificate of origin</b><small>'+(destKey==='us'?'CUSMA certificate will generate on create':destKey==='uk'?'UK TCA declaration will generate on create':'CETA declaration will generate on create')+'</small></div><span class="status st-green">Ready</span></div>';
  if(isUS){rows+='<div><span class="check-ic ci-done">✓</span><div><b>FDA prior notice</b><small>Required for food into the US. Will file from this record on create.</small></div><span class="status st-blue">Will file</span></div>';}
  if(shipEl('ship-product').value==='mustard'){rows+='<div><span class="check-ic ci-todo">!</span><div><b>Broker review pending</b><small>Maple mustard is still in broker review. Shipment will be created, freight held until review clears.</small></div><span class="status st-amber">Review</span></div>';}
  rows+='<div><span class="check-ic '+(needsLabel?'ci-todo':'ci-done')+'">'+(needsLabel?'!':'✓')+'</span><div><b>Destination label format</b><small>'+(needsLabel?'Not ready yet. Shipment will be marked Hold: label.':'Confirmed ready for '+d.label+'.')+'</small></div><span class="status '+(needsLabel?'st-amber':'st-green')+'">'+(needsLabel?'Blocking freight':'Done')+'</span></div>';
  shipEl('ship-compliance-list').innerHTML=rows;
  shipEl('ship-docs-box').innerHTML='<b>Documents that will be generated on create:</b> Commercial invoice, packing list, certificate of origin'+(isUS?', FDA prior notice':'')+' and bill of lading draft. All from this one record, nothing retyped.';
  var fp=shipFreightPrices();
  shipEl('freight-standard-price').textContent=shipMoney(fp.standard);shipEl('freight-standard-meta').textContent=d.days+' · Standard partner lane';
  shipEl('freight-expedited-price').textContent=shipMoney(fp.expedited);shipEl('freight-expedited-meta').textContent='Priority · Earlier window on the same lane';
  shipEl('freight-consolidated-price').textContent=shipMoney(fp.consolidated);shipEl('freight-consolidated-meta').textContent='Shared lane · +2 to 4 days, lower cost';
  var buyerCo2=COMPANIES[shipEl('ship-buyer').value];
  var buyerName=buyerCo2?buyerCo2.name:'The buyer';
  var escT=shipEl('ship-escrow-title');
  if(shipRequestRow){
    if(escT) escT.textContent='Escrow · already funded by the buyer';
    shipEl('ship-escrow-line').textContent=buyerName+' funded '+shipMoney(goods)+' into escrow with their request. Release trigger: customs clearance in '+(city||d.label)+'.';
  } else {
    if(escT) escT.textContent='Escrow · buyer funds before you ship';
    shipEl('ship-escrow-line').textContent='Creating this shipment sends '+buyerName+' a request to fund '+shipMoney(goods)+' into escrow. Freight books once they fund. Release trigger: customs clearance in '+(city||d.label)+'.';
  }
  /* Terms note: say plainly what the selected delivery terms mean here. */
  var tn=shipEl('ship-terms-note');
  if(tn){
    if(shipRequestRow) tn.textContent='Set by '+buyerName+' in their request and funded in escrow. Terms are part of the funded deal, so they cannot change here.';
    else if(shipEl('ship-terms').value==='EXW') tn.textContent='Factory gate: the buyer arranges and pays their own freight and clearance from your door, so the freight options in Step 4 do not apply.';
    else if(shipEl('ship-terms').value==='DDP') tn.textContent='Duties paid: freight, clearance and destination duty are all inside the total the buyer funds in escrow. They just receive the goods.';
    else tn.textContent='Delivered at place: you arrange freight and clearance through Apertra partners; the cost sits in the total the buyer funds in escrow.';
  }
  /* Freight: on a request the buyer chose the speed and funded it, so the
     options are a summary, not a choice. Under EXW there is no freight to
     book. Otherwise the exporter picks, and the buyer funds the pick. */
  var fOpts=shipEl('ship-freight-options'), fNote=shipEl('ship-freight-note'), intro4=shipEl('ship-step4-intro');
  var fLock=!!shipRequestRow||shipEl('ship-terms').value==='EXW';
  if(fOpts) fOpts.classList.toggle('locked',fLock);
  if(fNote){
    if(shipRequestRow){ fNote.style.display=''; fNote.innerHTML='<b>Chosen and funded by the buyer:</b> '+buyerName+' picked <b>'+shipFreight+' freight</b>'+(shipRequestWanted?' · wanted by '+shipRequestWanted:'')+' and paid for it in escrow. Nothing to choose and nothing for you to pay; just hand the goods to the carrier in time.'; }
    else if(shipEl('ship-terms').value==='EXW'){ fNote.style.display=''; fNote.textContent='Under EXW the buyer arranges and pays their own freight from your door, so no freight is booked here.'; }
    else fNote.style.display='none';
  }
  if(intro4) intro4.textContent=shipRequestRow
    ? 'The buyer picked the freight speed and funded it in escrow with their request, and the payment protection is already in place. This step is a summary, not a choice.'
    : 'Pick a freight option from aggregated partners, then confirm how the buyer pays. Funds are held by a regulated partner and released on clearance.';
  document.querySelectorAll('#ship-freight-options .freight-opt').forEach(function(b){b.classList.toggle('selected',b.getAttribute('data-freight')===shipFreight);});
}
function renderShipReview(){
  var buyerCo=COMPANIES[shipEl('ship-buyer').value];
  var buyerLoc=currentShipLoc();
  var buyerText=(buyerCo?buyerCo.name:shipEl('ship-buyer').options[shipEl('ship-buyer').selectedIndex].text)+(buyerLoc?' · '+buyerLoc.label:'');
  var p=SHIP_PROD[shipEl('ship-product').value];var qty=shipEl('ship-qty').value;var d=SHIP_DEST[shipEl('ship-dest').value];
  var origin=shipEl('ship-origin').value;var city=shipEl('ship-dest-city').value;
  var needsLabel=shipEl('ship-label-status').value==='needs';
  var t=shipTotals();
  shipEl('ship-review-grid').innerHTML=
    '<div class="review-item"><span>Buyer / importer</span><b>'+buyerText+'</b><small>Verified on Trade Network</small></div>'+
    '<div class="review-item"><span>Route &amp; terms</span><b>'+origin+' → '+city+', '+d.label+'</b><small>'+shipEl('ship-terms').value+' · '+d.days+'</small></div>'+
    '<div class="review-item"><span>Goods</span><b>'+p.short+' · '+Number(qty).toLocaleString('en-CA')+' units</b><small>HS '+p.hs+' · Duty '+(shipDutyRate()*100).toFixed(1)+'%</small></div>'+
    '<div class="review-item"><span>Freight &amp; compliance</span><b style="text-transform:capitalize">'+shipFreight+' freight</b><small>'+(needsLabel?'Hold: label until artwork uploaded':'All checks clear, ready to book')+'</small></div>';
  shipEl('ship-cost-table').innerHTML=
    '<div><span>Goods value</span><span>'+shipMoney(t.goods)+'</span></div>'+
    '<div><span>Duty ('+(shipDutyRate()*100).toFixed(1)+'%)</span><span>'+shipMoney(t.duty)+'</span></div>'+
    '<div><span>Freight ('+shipFreight+')</span><span>'+shipMoney(t.freight)+'</span></div>'+
    '<div><span>Brokerage</span><span>'+shipMoney(t.brokerage)+'</span></div>'+
    '<div><span>Insurance (0.6%) + FX/escrow (0.75%)</span><span>'+shipMoney(t.insurance+t.fx)+'</span></div>'+
    '<div><span>Total landed cost</span><span>'+shipMoney(t.total)+'</span></div>';
}
function setShipStep(n){
  shipStep=n;
  document.querySelectorAll('[data-ship-panel]').forEach(function(p){p.classList.toggle('active',parseInt(p.getAttribute('data-ship-panel'),10)===n);});
  document.querySelectorAll('#ship-steps .ship-step-dot').forEach(function(dot){var dn=parseInt(dot.getAttribute('data-dot'),10);dot.classList.toggle('active',dn===n);dot.classList.toggle('done',dn<n);});
  shipEl('ship-steps').style.display=n===6?'none':'flex';
  shipEl('ship-back-btn').style.visibility=n===1||n===6?'hidden':'visible';
  shipEl('ship-next-btn').style.display=(n>=5)?'none':'';
  shipEl('ship-create-btn').style.display=n===5?'':'none';
  shipEl('ship-modal-foot').style.display=n===6?'none':'flex';
  shipEl('ship-foot-note').textContent=shipRequestRow
    ? (n===5?'Step 5 of 5 · Creating generates the documents and books the freight. Escrow is already funded by the buyer.':('Step '+n+' of 5 · Buyer, goods and price are locked from the request; the rest is yours to set.'))
    : (n===5?'Step 5 of 5 · Creating generates documents and sends the escrow request.':('Step '+n+' of 5 · You can change any of this before you create the shipment.'));
  if(n===5) renderShipReview();
  var body=document.querySelector('.ship-modal-body');if(body)body.scrollTop=0;
}
function openShipFlow(opts){
  opts=opts||{};
  shipStep=1;shipFreight='standard';shipRequestRow=null;
  document.querySelectorAll('#ship-freight-options .freight-opt').forEach(function(b){b.classList.toggle('selected',b.getAttribute('data-freight')==='standard');});
  var banner=shipEl('ship-req-banner'); banner.style.display='none'; banner.innerHTML='';
  setShipBuyerLock(false);
  setShipGoodsLock(false);
  setShipTermsLock(false);
  shipRequestFreight=''; shipRequestWanted='';
  /* Full reset: a fresh open never inherits values from a previous wizard
     session. Request figures were leaking into brand-new shipments. */
  shipEl('ship-buyer').value='greatlakes';
  shipEl('ship-product').value='maple';
  shipEl('ship-qty').value='600';
  shipEl('ship-unit').value=SHIP_PROD['maple'].unit;
  shipEl('ship-terms').value='DAP';
  shipEl('ship-label-status').value='ready';
  if(opts.partner){
    var sel=shipEl('ship-buyer'); sel.value=opts.partner;
    applyShipBuyer();
    setShipBuyerLock(true, COMPANIES[opts.partner]?COMPANIES[opts.partner].name:'this partner');
  }
  if(opts.request){
    shipRequestRow=opts.row||null;
    if(opts.buyer){ shipEl('ship-buyer').value=opts.buyer; applyShipBuyer(); setShipBuyerLock(true, COMPANIES[opts.buyer]?COMPANIES[opts.buyer].name:'the buyer'); }
    if(opts.product){ shipEl('ship-product').value=opts.product; shipEl('ship-unit').value=SHIP_PROD[opts.product].unit; }
    if(opts.qty){ shipEl('ship-qty').value=opts.qty; }
    setShipGoodsLock(true);
    if(opts.terms){ shipEl('ship-terms').value=opts.terms; }
    setShipTermsLock(true);
    if(opts.freight){ shipFreight=opts.freight; shipRequestFreight=opts.freight; }
    shipRequestWanted=opts.wanted||'';
    var bn=COMPANIES[opts.buyer]?COMPANIES[opts.buyer].name:'The buyer';
    banner.innerHTML='<b>Request '+opts.request+' · '+bn+'</b> asked for these goods and has already funded escrow, freight included. Your only job is to create the shipment: buyer, goods, delivery location, delivery terms and freight are filled in from the request and locked to it. Documents and clearance generate when you create it.';
    banner.style.display='';
  }
  shipEl('ship-origin').value='Toronto';
  applyShipBuyer();
  updateShipLive();setShipStep(1);
  shipEl('ship-modal').classList.add('open');shipEl('ship-modal').setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeShipFlow(){
  shipEl('ship-modal').classList.remove('open');shipEl('ship-modal').setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}
document.querySelectorAll('[data-new-shipment]').forEach(function(b){b.addEventListener('click',function(ev){ev.preventDefault();openShipPicker();});});
/* Delegated: the picker markup sits after this script in the page, so its
   buttons do not exist yet when the script first runs. */
document.addEventListener('click',function(ev){
  if(ev.target.closest('[data-reqpick-close]')){ closeShipPicker(); return; }
  if(ev.target.closest('[data-reqpick-network]')){ closeShipPicker(); showPaneById('network'); }
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeShipPicker();});
document.querySelectorAll('[data-close-ship]').forEach(function(el){el.addEventListener('click',closeShipFlow);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&shipEl('ship-modal').classList.contains('open'))closeShipFlow();});
shipEl('ship-next-btn').addEventListener('click',function(){
  if(shipStep===2&&(parseFloat(shipEl('ship-qty').value)||0)<=0){shipEl('ship-qty').focus();return;}
  if(shipStep<5)setShipStep(shipStep+1);
});
shipEl('ship-back-btn').addEventListener('click',function(){if(shipStep>1)setShipStep(shipStep-1);});
shipEl('ship-buyer').addEventListener('change',function(){ applyShipBuyer(); });
shipEl('ship-loc-select').addEventListener('change',function(){
  var loc=currentShipLoc();
  if(loc){ shipEl('ship-dest').value=loc.dest; shipEl('ship-dest-city').value=loc.city; }
  updateShipLive();
});
shipEl('ship-buyer-unlock').addEventListener('click',function(){ setShipBuyerLock(false); shipEl('ship-buyer').focus(); });
/* Delegated: covers both the Requests panel buttons and the picker's. */
document.addEventListener('click',function(ev){
  var b=ev.target.closest('.inc-create');
  if(!b||b.disabled) return;
  var reqId=b.getAttribute('data-req');
  var canon=document.querySelector('#incoming-req-tbody .inc-create[data-req="'+reqId+'"]');
  var row=canon?canon.closest('[data-incoming]'):null;
  closeShipPicker();
  openShipFlow({request:reqId, buyer:b.getAttribute('data-buyer'), product:b.getAttribute('data-product'), qty:b.getAttribute('data-qty'), row:row, freight:b.getAttribute('data-freight')||'', terms:b.getAttribute('data-terms')||'', wanted:b.getAttribute('data-wanted')||''});
});
['ship-dest','ship-origin','ship-terms','ship-label-status'].forEach(function(id){shipEl(id).addEventListener('change',updateShipLive);});
shipEl('ship-dest-city').addEventListener('input',updateShipLive);
shipEl('ship-dest').addEventListener('change',updateShipLive);
shipEl('ship-product').addEventListener('change',function(){var p=SHIP_PROD[shipEl('ship-product').value];shipEl('ship-unit').value=p.unit;updateShipLive();});
['ship-qty','ship-unit'].forEach(function(id){shipEl(id).addEventListener('input',updateShipLive);});
document.querySelectorAll('#ship-freight-options .freight-opt').forEach(function(b){b.addEventListener('click',function(){shipFreight=b.getAttribute('data-freight');updateShipLive();});});
shipEl('ship-create-btn').addEventListener('click',function(){
  shipCreated++;lastCreatedId='AP-'+(2041+shipCreated);
  var p=SHIP_PROD[shipEl('ship-product').value];var qty=parseFloat(shipEl('ship-qty').value)||0;var goods=shipGoodsValue();
  var origin=shipEl('ship-origin').value;var city=shipEl('ship-dest-city').value||SHIP_DEST[shipEl('ship-dest').value].label;
  var needsLabel=shipEl('ship-label-status').value==='needs';
  var tbody=shipEl('shipments-tbody');
  if(tbody){
    var tr=document.createElement('tr');tr.className='ship-new-row';
    var tdId=document.createElement('td');tdId.className='mono';tdId.textContent=lastCreatedId;
    var tdGoods=document.createElement('td');tdGoods.textContent=p.short+', '+qty.toLocaleString('en-CA')+' units';
    var tdRoute=document.createElement('td');tdRoute.textContent=origin+' → '+city;
    var tdVal=document.createElement('td');tdVal.className='num';tdVal.textContent=Math.round(goods).toLocaleString('en-CA');
    var tdFreight=document.createElement('td');var sp=document.createElement('span');sp.className='status '+(needsLabel?'st-amber':'st-blue');sp.textContent=needsLabel?'Hold: label':'Booked · '+shipFreight;tdFreight.appendChild(sp);
    var tdCustoms=document.createElement('td');tdCustoms.textContent='Docs generated';
    var tdPay=document.createElement('td');tdPay.textContent=shipRequestRow?'Escrow funded':'Escrow requested';
    tr.appendChild(tdId);tr.appendChild(tdGoods);tr.appendChild(tdRoute);tr.appendChild(tdVal);tr.appendChild(tdFreight);tr.appendChild(tdCustoms);tr.appendChild(tdPay);
    tbody.insertBefore(tr,tbody.firstChild);
  }
  var kpi=shipEl('kpi-active-shipments');if(kpi)kpi.textContent=String(parseInt(kpi.textContent,10)+1);
  var navCnt=shipEl('shipments-nav-count');if(navCnt)navCnt.textContent=String(parseInt(navCnt.textContent,10)+1);
  shipEl('ship-success-id').textContent=lastCreatedId;
  shipEl('ship-success-text').textContent='Shipment '+lastCreatedId+' for '+p.short+' ('+shipMoney(goods)+') to '+city+' is now at the top of Shipments. Documents have been generated, '+(shipRequestRow?'escrow was already funded by the buyer with their request':'the buyer has been sent the '+shipMoney(goods)+' escrow funding request')+', and freight is '+(needsLabel?'on hold until the revised label is uploaded.':'booked on the '+shipFreight+' option.');
  if(shipRequestRow){
    var st=shipRequestRow.querySelector('.inc-status');
    if(st){ st.textContent='Shipment '+lastCreatedId+' created'; st.className='status st-green inc-status'; }
    var cb=shipRequestRow.querySelector('.inc-create');
    if(cb){ cb.disabled=true; cb.textContent='Shipment created'; }
    var left=document.querySelectorAll('#incoming-req-tbody .inc-create:not([disabled])').length;
    var cnt=shipEl('incoming-count');
    if(cnt) cnt.textContent=left? left+' waiting on you' : 'All caught up';
    shipRequestRow=null;
  }
  setShipStep(6);
});
shipEl('ship-view-btn').addEventListener('click',function(){closeShipFlow();showPaneById('shipments');});
shipEl('ship-another-btn').addEventListener('click',function(){closeShipFlow();openShipPicker();});
applyShipBuyer();
updateShipLive();
updateShipPartnerPreview();

runCalc();
