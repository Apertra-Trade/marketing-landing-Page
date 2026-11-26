document.querySelectorAll('[data-goto-network]').forEach(function(el){
  el.addEventListener('click', function(ev){ ev.preventDefault(); window.location.href='https://apertra-trade.github.io/development/workspace.html'; });
});
document.querySelectorAll('[data-view="app"]').forEach(function(el){
  el.addEventListener('click', function(ev){ ev.preventDefault(); window.location.href='https://apertra-trade.github.io/development/workspace.html'; });
});
document.querySelectorAll('[data-view="landing"]').forEach(function(el){
  el.addEventListener('click', function(ev){ ev.preventDefault(); window.location.href='index.html'; });
});
