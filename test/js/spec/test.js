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
      let api = new ZimbraAdminApi({
        'url': 'http://localhost',
        'user': 'user',
        'password':'pass'});
      api.login(null, function(err){
        let error = api.handleError(err);
        expect(error.constructor.name).to.equal('Error');
        expect(error.title).to.equal('timeout');
      });
    });

    it('return error if wrong validation', function(done) {
      var auth_data2 = JSON.parse(JSON.stringify(auth_data));
      auth_data2.password = 'abc';
      let api = new ZimbraAdminApi(auth_data2);
      let callback = function(err, response) {
        let error = api.handleError(err);
        expect(error.constructor.name).to.equal('Error');
        expect(error.title).to.equal('Internal Server Error');
        expect(error.extra.code).to.equal('account.AUTH_FAILED');
        done();
      };
      api.login(callback);
    });

    it('return token if ok validation', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      let callback = function(err, response) {
        expect(api.client.token).to.exist;
        done();
      };
      api.login(callback);
    });

    it('should delete the password after authentication', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      let callback = function(err, response) {
        expect(api.secret).not.to.exist;
        expect(api.password).not.to.exist;
        done();
      }
      api.login(callback);
    });

    it('should get all domains', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      api.getAllDomains(function(err, data){
        if (err) console.log(err);
        expect(data.domain[0].constructor.name).to.equal('Domain');
        done();
      });
    });

    it('should get all accounts', function(done) {
      // var callback = sinon.spy();
      let api = new ZimbraAdminApi(auth_data);
      // var proxy = api.getAllAccounts(callback);
      api.getAllAccounts(function(err, data){
        if (err) console.log(err);
        expect(data.account[0].constructor.name).to.equal('Account');
        done();
      });
    });

    it('should get all distribution_lists', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      api.getAllDistributionLists(function(err, data){
        if (err) console.log(err);
        expect(data.dl[0].constructor.name).to.equal('DistributionList');
        done();
      });
    });

    it('should get and return an account', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getAccount('admin@zboxapp.dev', function(err, data){
        expect(data.constructor.name).to.equal('Account');
        expect(data.name).to.equal('admin@zboxapp.dev');
        done();
      });
    });

    it('should return an error if account not found', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getAccount('noexiste@nuncajams.com', function(err, data){
        expect(err.extra.code).to.equal('account.NO_SUCH_ACCOUNT');
        done();
      });
    });

    it('should return an error if domain not found', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getDomain('nuncajams.com', function(err, data){
        expect(err.extra.code).to.equal('account.NO_SUCH_DOMAIN');
        done();
      });
    });

    it('should return the DL', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getDistributionList('abierta@customer.dev', function(err, data){
        expect(data.name).to.equal('abierta@customer.dev');
        done();
      });
    });

    it('should get and return with name or id', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let callback = function(err, data){
        let domain_id = data.id;
        api.getDomain(domain_id, function(err, data){
          expect(data.name).to.equal('zboxapp.dev');
          done();
        });
      };
      api.getDomain('zboxapp.dev', callback);
    });

    it('should create and return an account', function(done){
      let account_name = Date.now() + '@big.com';
      let account_password = Date.now();
      let account_attributes = {};
      let api = new ZimbraAdminApi(auth_data);
      api.createAccount(account_name, account_password, account_attributes, function(err, data){
        if (err) return console.log(err);
        expect(data.name).to.equal(account_name);
        done();
      });
    });

    it('should create and return Domain', function(done){
      let resource_name = Date.now() + '.dev';
      let resource_attributes = {};
      let api = new ZimbraAdminApi(auth_data);
      api.createDomain(resource_name, resource_attributes, function(err, data){
        if (err) return console.log(err);
        expect(data.name).to.equal(resource_name);
        done();
      });
    });

    it('should return error "account.DOMAIN_EXISTS" if Domain Exists', function(done){
      let resource_name = 'zboxapp.dev';
      let resource_attributes = {};
      let api = new ZimbraAdminApi(auth_data);
      api.createDomain(resource_name, resource_attributes, function(err, data){
        expect(err.extra.code).to.equal('account.DOMAIN_EXISTS');
        done();
      });
    });

    it('should create and return Domain with attributes', function(done){
      let resource_name = Date.now() + '.dev';
      let resource_attributes = {
        zimbraSkinLogoURL: 'http://www.zboxapp.com',
        postOfficeBox: 'ZBoxApp'
      };
      let api = new ZimbraAdminApi(auth_data);
      let callback = function(err, data){
        if (err) return console.log(err);
        expect(data.attrs.zimbraSkinLogoURL).to.equal('http://www.zboxapp.com');
        expect(data.attrs.postOfficeBox).to.equal('ZBoxApp');
        done();
      };
      api.createDomain(resource_name, resource_attributes, callback);
    });


    it('should create and return an account with extra attributes', function(done){
      let account_name = Date.now() + '@big.com';
      let account_password = Date.now();
      let account_attributes = { 'sn': 'Bruna', 'givenName': 'Patricio' };
      let api = new ZimbraAdminApi(auth_data);
      api.createAccount(account_name, account_password, account_attributes, function(err, data){
        if (err) return console.log(err);
        expect(data.attrs.sn).to.equal('Bruna');
        expect(data.attrs.givenName).to.equal('Patricio');
        done();
      });
    });

    it('getInfo() should return the logged user info', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let callback = function(err, data) {
        if (err) return console.log(err);
        api.getInfo(function(err, data){
          if (err) return console.log(err);
          expect(data.name).to.equal('admin@zboxapp.dev');
          done();
        });
      };
      api.login(callback);
    });

    it('should return directorySearch with total info', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let query_object = {limit: 10, domain: 'customer.dev', types: "accounts,distributionlists,aliases"};
      api.directorySearch(query_object, function(err, data){
        expect(data.more).to.equal(true);
        expect(data.total).to.be.above(1);
        expect(data.account.length).to.be.at.least(2);
        done();
      });
    });

    it('should modify Account attributes', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let description = Date.now().toString();
      let physicalDeliveryOfficeName = Date.now().toString();
      let attributes = {
        physicalDeliveryOfficeName: physicalDeliveryOfficeName,
        description: description
      };
      api.getAccount('admin@zboxapp.dev', function(err, data){
        if (err) return console.log(err);
        api.modifyAccount(data.id, attributes, function(err, data){
          if (err) return console.log(err);
          expect(data.attrs.description).to.be.equal(description);
          expect(data.attrs.physicalDeliveryOfficeName).to.be.equal(physicalDeliveryOfficeName);
          done();
        });
      });
    });

    it('should modify Domain attributes', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let description = Date.now().toString();
      let attributes = {
        description: description
      };
      api.getDomain('zboxapp.dev', function(err, data){
        if (err) console.log(err);
        api.modifyDomain(data.id, attributes, function(err, data){
          expect(data.attrs.description).to.be.equal(description);
          done();
        });
      });
    });

    it('should modify DistributionList attributes', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let description = Date.now().toString();
      let attributes = {
        description: description
      };
      api.getDistributionList('abierta@customer.dev', function(err, data){
        if (err) console.log(err);
        api.modifyDistributionList(data.id, attributes, function(err, data){
          expect(data.attrs.description).to.be.equal(description);
          done();
        });
      });
    });

  });
})();

    
