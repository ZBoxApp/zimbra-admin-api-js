/* global describe, it, SpotifyWebApi, expect, beforeEach, afterEach, sinon */
(function() {
  'use strict';

  var auth_data = {
    'url': 'http://zimbra.zboxapp.dev:8000/service/admin/soap',
    'user': 'admin@zboxapp.dev',
    'password':'12345678'
  };

  describe('Basic tests', function() {
    this.timeout(5000);


    it('should return the Delegated Token', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.delegateAuth('admin', 3672, function(err, data) {
        if (err) console.error(err);
        expect(data.authToken).to.exist;
        expect(data.lifetime).to.equal(3672000);
        done();
      });
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
          if (err) return console.error(err);
          expect(data.name).to.equal('zboxapp.dev');
          done();
        });
      };
      api.getDomain('zboxapp.dev', callback);
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

    it('should return Error with wrong Login', function(done){
      let auth_obj = {
        'url': 'http://zimbra.zboxapp.dev:8000/service/admin/soap',
        'user': 'admin@zboxapp.dev',
        'password':'12345678910'
      }
      let api = new ZimbraAdminApi(auth_obj);
      api.login(function(err, data){
        expect(err.extra.code).to.be.equal("account.AUTH_FAILED");
        expect(err.extra.reason).to.match(/authentication failed/);
        done();
      });
    });

    it('should return directorySearch with total info', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let query_object = {limit: 10, domain: 'customer.dev', types: "accounts"};
      api.directorySearch(query_object, function(err, data){
        expect(data.more).to.equal(true);
        expect(data.total).to.be.above(1);
        expect(data.account.length).to.be.at.least(1);
        done();
      });
    });

    it('countAccounts hould return {} for empty Domain', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.countAccounts('juanitalapoderosa.com', function(err, data){
        if (err) console.error(err);
        expect(data).to.be.empty;
        done();
      });
    });

    it('Should return correct response from BatchRequest', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.client.options.timeout = 5000;
      let callback = function(err, data) {
        if (err) return console.error(err);
        expect(data.GetAllAccountsResponse).to.exist;
        expect(data.GetAllDomainsResponse).to.exist;
        done();
      }
      const getAllAccounts = api.buildRequestData('GetAllAccounts', callback);
      const getAllDomains = api.buildRequestData('GetAllDomains', callback);
      const that = this;
      let getCallback = function(err, response){
        if (err) return this.handleError(err);
        api.makeBatchRequest([getAllAccounts, getAllDomains], callback);
        done();
      };
      api.login(getCallback);
    });

  });

  describe('Account tests', function() {
    this.timeout(5000);

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

    it('Should create Account with an array attributes', function(done){
      let account_name = Date.now() + '@big.com';
      let account_password = Date.now();
      let account_attributes = { 'sn': 'Bruna', 'givenName': 'Patricio' };
      account_attributes.amavisBlacklistSender = ['1.com', '2.com', '3.com'];
      let api = new ZimbraAdminApi(auth_data);
      api.createAccount(account_name, account_password, account_attributes, function(err, data){
        if (err) return console.log(err);
        expect(data.attrs.sn).to.equal('Bruna');
        expect(data.attrs.givenName).to.equal('Patricio');
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

    it('should remove account', function(done){
      let account_name = Date.now() + '@big.com';
      let account_password = Date.now();
      let account_attributes = {};
      let api = new ZimbraAdminApi(auth_data);
      api.createAccount(account_name, account_password, account_attributes, function(err, data){
        if (err) return console.log(err);
        api.removeAccount(data.id, function(err, data){
          if (err) return console.log(err);
          expect(data._jsns).to.equal("urn:zimbraAdmin");
          done();
        });
      });
    });

    it('should set password', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getAccount('pbruna@itlinux.cl', function(err, data){
        let account = data;
        account.setPassword('123456789', function(err, data){
          if (err) return console.log(err);
          expect(data).to.be.empty;
          done();
        });
      });
    });

    it('Should Return Error for Invalid Password', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getAccount('pbruna@itlinux.cl', function(err, data){
        let account = data;
        account.setPassword('', function(err, data){
          expect(err).to.exist;
          done();
        });
      });
    });

    it('Should Get The Account Mailbox', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getAccount('cos_basic_14@customer.dev', function(err, data){
        let account = data;
        account.getMailbox(function(err, data){
          if (err) return console.log(err);
          expect(data.size).to.be.exist;
          done();
        });
      });
    });

    it('Should Get The Account Mailbox Size', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getAccount('cos_basic_14@customer.dev', function(err, data){
        let account = data;
        account.getMailboxSize(function(err, data){
          if (err) return console.log(err);
          expect(data).to.be.at.least(0);
          done();
        });
      });
    });

    it('Should return error for bad AddAccountAlias', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let alias = 'pbruna@gmail.com';
      api.getAccount('pbruna@itlinux.cl', function(err, data){
        let account = data;
        account.addAccountAlias(alias, function(err, data){
          expect(err.extra.code).to.be.equal("account.NO_SUCH_DOMAIN");
          done();
        });
      });
    });

    it('AddAccountAlias should add the alias', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let alias = Date.now() + '@itlinux.cl';
      api.getAccount('pbruna@itlinux.cl', function(err, data){
        let account = data;
        account.addAccountAlias(alias, function(err, data){
          if (err) return console.error(err);
          expect(err).to.be.null;
          done();
        });
      });
    });

    it('RemoveAccountAlias should remove the alias', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let alias = Date.now() + '@itlinux.cl';
      api.getAccount('pbruna@itlinux.cl', function(err, data){
        let account = data;
        account.addAccountAlias(alias, function(err, data){
          if (err) return console.error(err);
          account.removeAccountAlias(alias, function(err, data){
            if (err) return console.error(err);
            expect(err).to.be.null;
            done();
          });
        });
      });
    });

    it('Should rename the account', function(done){
      let account_name = Date.now() + '@big.com';
      let new_name = Date.now() + '1' + '@big.com';
      let account_password = Date.now();
      let account_attributes = {};
      let api = new ZimbraAdminApi(auth_data);
      api.createAccount(account_name, account_password, account_attributes, function(err, account){
        if (err) return console.log(err);
        const account_id = account.id;
        account.rename(new_name, function(err, data){
          if (err) return console.log(err);
          expect(data.id).to.equal(account_id);
          expect(data.name).to.equal(new_name);
          done();
        });
      });
    });

    it('Should return the viewMailPath', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getAccount('admin@zboxapp.dev', function(err, account){
        if (err) return console.error(err);
        account.viewMailPath(null, function(err, data){
          if (err) return console.log(err);
          expect(data).to.match(/adminPreAuth=1$/);
          done();
        });
      });
    });


  });

  describe('Domain tests', function() {
    this.timeout(5000);

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

    it('should remove Domain', function(done){
      let resource_name = Date.now() + '.dev';
      let resource_attributes = {};
      let api = new ZimbraAdminApi(auth_data);
      api.createDomain(resource_name, resource_attributes, function(err, data){
        if (err) return console.log(err);
        api.removeDomain(data.id, function(err, data){
          if (err) return console.log(err);
          expect(data._jsns).to.equal("urn:zimbraAdmin");
          done();
        });
      });
    });

    it('should counts of account for the Domain', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.countAccounts('customer.dev', function(err, data){
        if (err) console.error(err);
        expect(data.default.used).to.be.above(1);
        done();
      });
    });

    it('Batch Count Account Response Should return the correct', function(done){
      let api = new ZimbraAdminApi(auth_data);
      const callback = function(err, data){
        if (err) console.error(err);
        expect(data[0].default.used).to.be.above(1);
        done();
      };
      api.batchCountAccounts(['customer.dev', 'zboxapp.dev'], callback);
    });


    it('domain.countAccounts() should return the counts', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getDomain('customer.dev', function(err, data){
        if (err) console.error(err);
        let domain = data;
        domain.countAccounts(function(e, d){
          expect(d.default.used).to.be.above(1);
          done();
        });
      });
    });

    it('domain.countAccounts() should return the account Limits', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getDomain('customer.dev', function(err, data){
        if (err) console.error(err);
        let domain = data;
        domain.countAccounts(function(e, d){
          expect(d.basic.limit).to.be.above(1);
          done();
        });
      });
    });

    it('domain.getAdmins() should return the domain admins', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getDomain('customer.dev', function(err, data){
        if (err) console.error(err);
        let domain = data;
        domain.getAdmins(function(e, d){
          if (e) return console.error(e);
          expect(d.account.length).to.be.above(1);
          expect(d.account[0].constructor.name).to.be.equal('Account');
          done();
        });
      });
    });

    it('domain.getAllDistributionLists should return the DLs', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getDomain('customer.dev', function(err, data){
        if (err) console.error(err);
        let domain = data;
        domain.getAllDistributionLists(function(e, d){
          if (e) return console.log(e);
          expect(d[0].constructor.name).to.be.equal('DistributionList');
          done();
        });
      });
    });

    it('addAdmin should add Admin', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let domain_admin = 'domain_admin@customer.dev';
      let resource_name = Date.now() + '.dev';
      api.getAccount(domain_admin, function(err, account){
        api.createDomain(resource_name, {}, function(err, data){
          if (err) console.error(err);
          let domain = data;
          domain.addAdmin(account.id, function(e, d){
            if (e) return console.error(e);
            expect(err).to.be.null;
            domain.getACLs(function(e, d){
              if (e) return console.error(e);
              expect(d[0].grantee.name).to.be.equal(account.name);
              done();
            });
          });
        });
      });
    });

    it('removeAdmin should remove the Admin', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let domain_admin = 'domain_admin@customer.dev';
      let resource_name = Date.now() + '.dev';
      api.createDomain(resource_name, {}, function(err, domain){
        domain.addAdmin(domain_admin, function(e, d){
          domain.removeAdmin(domain_admin, function(e, d){
            domain.getACLs(function(e, d){
              if (e) return console.error(e);
              expect(d.length).to.be.equal(0);
              done();
            });
          });
        });
      });
    });

  });

  describe('DistributionList tests', function() {
    this.timeout(5000);

    it('should remove DL', function(done){
      let resource_name = Date.now() + '@zboxapp.dev';
      let resource_attributes = {};
      let api = new ZimbraAdminApi(auth_data);
      api.createDistributionList(resource_name, resource_attributes, function(err, data){
        if (err) return console.log(err);
        api.removeDistributionList(data.id, function(err, data){
          if (err) return console.log(err);
          expect(data._jsns).to.equal("urn:zimbraAdmin");
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

    it('Add member to DL should work with only one', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let member = Date.now().toString() + '@customer.dev';
      api.getDistributionList('abierta@customer.dev', function(err, data){
        if (err) console.log(err);
        const dl = data;
        dl.addMembers(member, function(err, data){
          if (err) return console.error(err);
          expect(err).to.be.null;
          done();
        });
      });
    });

    it('Add member to DL should work with array', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let name = Date.now().toString();
      let members = [name + '@customer.dev', name + '@zboxapp.dev' ];
      api.getDistributionList('abierta@customer.dev', function(err, data){
        if (err) console.log(err);
        const dl = data;
        dl.addMembers(members, function(err, data){
          if (err) return console.error(err);
          expect(err).to.be.null;
          done();
        });
      });
    });

    it('Remove members works with an array', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let name = Date.now().toString();
      let members = [name + '@customer.dev', name + '@zboxapp.dev' ];
      api.getDistributionList('abierta@customer.dev', function(err, data){
        if (err) console.log(err);
        const dl = data;
        const original_members = dl.members;
        dl.addMembers(members, function(err, data){
          if (err) return console.error(err);
          dl.removeMembers(members, function(err, data){
            if (err) return console.error(err);
            api.getDistributionList('abierta@customer.dev', function(err, data){
              expect(original_members.length).to.be.equal(data.members.length);
              done();
            });
          });
        });
      });
    });

    it('dl.getOwners should return the DL owners', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      api.getDistributionList('restringida@customer.dev', function(err, data){
        if (err) console.log(err);
        const dl = data;
        dl.getOwners(function(err, data){
          if (err) console.log(err);
          expect(data[0].type).to.be.exist;
          done();
        });
      });
    });

    it('addOwner to DL should add Owner', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let owner_email = 'domain_admin@customer.dev';
      let resource_name = Date.now() + '@customer.dev';
      api.createDistributionList(resource_name, {}, function(err, dl){
        dl.addOwner(owner_email, function(e, d){
          if (e) return console.error(e);
          expect(err).to.be.null;
          dl.getACLs(function(e, d){
            if (e) return console.error(e);
            expect(d[0].grantee.name).to.be.equal(owner_email);
            done();
          });
        });
      });
    });

    it('removeOwner should remove the Owner', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let owner_email = 'domain_admin@customer.dev';
      let resource_name = Date.now() + '@customer.dev';
      api.createDistributionList(resource_name, {}, function(err, dl){
        dl.addOwner(owner_email, function(e, d){
          dl.removeOwner(owner_email, function(e, d){
            dl.getACLs(function(e, d){
              if (e) return console.error(e);
              expect(d.length).to.be.equal(0);
              done();
            });
          });
        });
      });
    });

    it('Should rename the DL', function(done){
      let dl_name = Date.now() + '@big.com';
      let new_name = Date.now() + '1' + '@big.com';
      let dl_attrs = {};
      let api = new ZimbraAdminApi(auth_data);
      api.createDistributionList(dl_name, dl_attrs, function(err, dl){
        if (err) return console.log(err);
        const dl_id = dl.id;
        dl.rename(new_name, function(err, data){
          if (err) return console.log(err);
          expect(data.id).to.equal(dl_id);
          expect(data.name).to.equal(new_name);
          done();
        });
      });
    });



  });

  describe('Grants tests', function() {
    this.timeout(5000);

    it('should get the Grants with null target_data', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      let grantee_data = {type: 'usr', identifier: 'domain_admin@customer.dev'};
      api.getGrants(null, grantee_data, function(err, data){
        if (err) console.log(err);
        expect(data[0].constructor.name).to.equal('Grant');
        done();
      });
    });

    it('should get the Grants with null grantee_data', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      let target_data = {type: 'domain', identifier: 'customer.dev'};
      api.getGrants(target_data, null, function(err, data){
        if (err) console.log(err);
        expect(data[0].constructor.name).to.equal('Grant');
        expect(data[0].right._content).to.equal("domainAdminRights");
        done();
      });
    });

    it('should return Empty Array if no Grants', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      let target_data = {type: 'domain', identifier: 'zboxapp.dev'};
      api.getGrants(target_data, null, function(err, data){
        if (err) console.log(err);
        expect(data).to.be.empty;
        done();
      });
    });
  });

})();
