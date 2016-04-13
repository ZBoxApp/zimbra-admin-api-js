/* global describe, it, SpotifyWebApi, expect, beforeEach, afterEach, sinon */
(function() {
  'use strict';

  var auth_data = {
    'url': 'http://zimbra.zboxapp.dev:8000/service/admin/soap',
    'user': 'admin@zboxapp.dev',
    'password':'12345678'
  };

  function loadFixture(fixtureName) {
    var req = new XMLHttpRequest();
    req.open('GET', 'fixtures/' + fixtureName + '.json', false);
    req.send(null);
    if (req.status === 200) {
      return JSON.parse(req.responseText);
    } else {
      return null;
    }
  }

  describe('Basic tests', function() {

    this.fixtures = {
      domain: loadFixture('domain')
    };

    it('should return error object when timeout', function() {
      var api = new ZimbraAdminApi({
        'url': 'http://localhost',
        'user': 'user',
        'password':'pass'});
      api.client.options.timeout = 10000;
      api.login(null, function(err){
        let error = api.handleError(err);
        expect(error.constructor.name).to.equal('Error');
        expect(error.title).to.equal('timeout');
      });
    });

    it('return error if wrong validation', function() {
      var auth_data2 = JSON.parse(JSON.stringify(auth_data));
      auth_data2.password = 'abc';
      var api = new ZimbraAdminApi(auth_data2);
      var callback = function(err, response) {
        let error = api.handleError(err);
        expect(error.constructor.name).to.equal('Error');
        expect(error.title).to.equal('Internal Server Error');
        expect(error.extra.code).to.equal('account.AUTH_FAILED');
      }
      api.login(callback);
    });

    it('return token if ok validation', function() {
      var api = new ZimbraAdminApi(auth_data);
      var callback = function(err, response) {
        expect(api.client.token).to.exist;
      }
      api.login(callback);
    });

    it('should get all domains', function() {
      var api = new ZimbraAdminApi(auth_data);
      api.getAllDomains(function(err, data){
        if (err) console.log(err);
        expect(data[0].constructor.name).to.equal('Domain');
      });
    });

    it('should get all accounts', function() {
      var api = new ZimbraAdminApi(auth_data);
      api.getAllAccounts(function(err, data){
        if (err) console.log(err);
        expect(data[0].constructor.name).to.equal('Account');
      });
    });

    it('should get all distribution_lists', function() {
      var api = new ZimbraAdminApi(auth_data);
      api.getAllDistributionLists(function(err, data){
        if (err) console.log(err);
        expect(data[0].constructor.name).to.equal('DistributionList');
      });
    });

  });
})();

    // it('should get all domains', function() {
    //   var api = new ZimbraAdminApi(auth_data);
    //   var success = function(d){
    //     d.forEach(function(v){
    //       console.log(v.name);
    //     })
    //   };
    //   var error = function(d){console.log(d);};
    //   // sucess, err (Why)?
    //   api.getAllAccounts(function(data, err){
    //     if (err) return console.log(err);
    //     data.forEach(function(v){
    //       console.log(v.id + ' ' + v.name);
    //     })
    //   });
    //
    // });
    //
    //
    // describe('Using callbacks', function() {

      // it('should get a track', function() {
      //   var callback = sinon.spy();
      //   var api = new SpotifyWebApi();
      //   api.getTrack('3Qm86XLflmIXVm1wcwkgDK', callback);
      //   that.requests[0].respond(200,
      //     {'Content-Type':'application/json'},
      //     JSON.stringify(that.fixtures.track)
      //   );
      //   expect(callback.calledWith(null, that.fixtures.track)).to.be.ok;
      //   expect(that.requests).to.have.length(1);
      //   expect(that.requests[0].url).to.equal('https://api.spotify.com/v1/tracks/3Qm86XLflmIXVm1wcwkgDK');
      // });
      //
      // it('should get multiple tracks', function() {
      //   var callback = sinon.spy();
      //   var api = new SpotifyWebApi();
      //   api.getTracks(['0eGsygTp906u18L0Oimnem', '1lDWb6b6ieDQ2xT7ewTC3G'], callback);
      //   that.requests[0].respond(200,
      //     {'Content-Type':'application/json'},
      //     JSON.stringify(that.fixtures.tracks)
      //   );
      //   expect(callback.calledWith(null, that.fixtures.tracks)).to.be.ok;
      //   expect(that.requests).to.have.length(1);
      //   expect(that.requests[0].url).to.equal('https://api.spotify.com/v1/tracks/?ids=0eGsygTp906u18L0Oimnem%2C1lDWb6b6ieDQ2xT7ewTC3G');
      // });
      //
      // it('should get an album', function() {
      //   var callback = sinon.spy();
      //   var api = new SpotifyWebApi();
      //   api.getAlbum('0sNOF9WDwhWunNAHPD3Baj', callback);
      //   that.requests[0].respond(200,
      //     {'Content-Type':'application/json'},
      //     JSON.stringify(that.fixtures.album)
      //   );
      //   expect(callback.calledWith(null, that.fixtures.album)).to.be.ok;
      //   expect(that.requests).to.have.length(1);
      //   expect(that.requests[0].url).to.equal('https://api.spotify.com/v1/albums/0sNOF9WDwhWunNAHPD3Baj');
      // });
      //
      // it('should get an albums\'s tracks', function() {
      //   var callback = sinon.spy();
      //   var api = new SpotifyWebApi();
      //   api.getAlbumTracks('0sNOF9WDwhWunNAHPD3Baj', callback);
      //   that.requests[0].respond(200,
      //     {'Content-Type':'application/json'},
      //     JSON.stringify(that.fixtures.album_tracks)
      //   );
      //   expect(callback.calledWith(null, that.fixtures.album_tracks)).to.be.ok;
      //   expect(that.requests).to.have.length(1);
      //   expect(that.requests[0].url).to.equal('https://api.spotify.com/v1/albums/0sNOF9WDwhWunNAHPD3Baj/tracks');
      // });
