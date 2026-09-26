(()=>{const routes={'#chords':'/chords/','#scales':'/scales/','#quiz':'/quiz/'};const target=routes[location.hash.split('/')[0]];if(target)location.replace(target)})();
