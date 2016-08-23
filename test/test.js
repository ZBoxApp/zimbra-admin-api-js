'use strict';

// For node SSL Access
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var requireHelper = require('./require_helper'),
    ZimbraAdminApi = requireHelper('index.js'),
    expect = require('chai').expect,
    superagent = require('superagent');

var zimbraURL = process.env.ZIMBRA_URL || 'https://localhost:7071/service/admin/soap';
var zimbraAdminUser = process.env.ZIMBRA_USER || 'admin@zboxapp.dev';
var zimbraAdminPassword = process.env.ZIMBRA_PASSWORD || '12345678';

(function() {
  'use strict';

  var auth_data = {
    'url': zimbraURL,
    'user': zimbraAdminUser,
    'password': zimbraAdminPassword
  };

  describe('Basic tests', function() {
    this.timeout(10000);

    // it('Should remove the token', function(done){
    //   let api = new ZimbraAdminApi(auth_data);
    //   api.login(function(err, data){
    //     if (err) console.error(err);
    //     done();
    //   });
    // });

    it('domain.getAdmins() should return the domain admins', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getDomainAdmins('customer.dev', function(err, data){
        if (err) console.error(err);
        expect(data.account.length).to.be.above(1);
        expect(data.account[0].constructor.name).to.be.equal('Account');
        done();
      });
    });

    it('addAdmin should add Admin', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let domain_admin = Date.now() + '@customer.dev';
      let resource_name = Date.now() + '.dev';
      api.createAccount(domain_admin, '12dda.222', {},  function(err, account){
        if (err) return console.error(err);
        api.createDomain(resource_name, {}, function(err, data){
          if (err) console.error(err);
          let domain = data;
          const coses = ['basic', 'premium'];
          api.addDomainAdmin(domain.name, account.id, coses,  function(e, d){
            if (e) return console.error(e);
            expect(err).to.be.null;
            d.getACLs(function(e, acls){
              if (e) return console.error(e);
              const expectedGrants = ["domainAdminRights", "set.dl.zimbraACE"];
              const actualGrants = acls.map(function(acl){return acl.rightName}).sort()
              expect(expectedGrants[0]).to.be.equal(actualGrants[0]);
              expect(expectedGrants[2]).to.be.equal(actualGrants[2]);
              d.getAdmins(function(e, admins){
                if (e) return console.error(e);
                expect(admins.account[0].name).to.be.equal(domain_admin);
                done();
              })
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
        domain.addAdmin(domain_admin, [], function(e, d){
          api.removeDomainAdmin(domain.name, domain_admin, [], function(e, d){
            domain.getACLs(function(e, d){
              if (e) return console.error(e);
              expect(d.length).to.be.equal(0);
              done();
            });
          });
        });
      });
    });

    it('Should return the viewMailPath', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getAccountViewMailPath('admin@zboxapp.dev', null, function(err, account){
        if (err) return console.error(err);
        expect(account).to.match(/adminPreAuth=1$/);
        done();
      });
    });

    it('getDistributionListOwners should return the DL owners', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      api.getDistributionListOwners('restringida@customer.dev', function(err, data){
        if (err) console.log(err);
        expect(data[0].type).to.be.exist;
        done();
      });
    });

    it('addDistributionListOwner to DL should add Owner', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let owner_email = 'domain_admin@customer.dev';
      let resource_name = Date.now() + '@customer.dev';
      api.createDistributionList(resource_name, {}, function(err, dl){
        if (err) return console.error(err);
        api.addDistributionListOwner(dl.name, owner_email, function(e, dl){
          if (e) return console.error(e);
          expect(e).to.be.null;
          api.getDistributionListOwners(resource_name, function(err, data){
            if (err) return console.error(err);
            expect(data[0].name).to.be.equal(owner_email);
            done();
          })
        });
      });
    });

    it('removeDistributionListOwner should remove the Owner', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let owner_email = 'domain_admin@customer.dev';
      let resource_name = Date.now() + '@customer.dev';
      api.createDistributionList(resource_name, {}, function(err, dl){
        dl.addOwner(owner_email, function(e, d){
          api.removeDistributionListOwner(dl.name, owner_email, function(err, data){
            if (err) return console.error(err);
            api.getDistributionListOwners(resource_name, function(err, data){
              if (err) return console.error(err);
              expect(data).to.be.empty;
              done();
            });
          })
        });
      });
    });

    it('should return the Delegated Token', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.delegateAuth('admin', 3672, function(err, data) {
        if (err) console.error(err);
        expect(data.authToken).to.exist;
        expect(data.lifetime).to.equal(3672000);
        done();
      });
    });

    it('Should Flush the Cache', function(done){
      let api = new ZimbraAdminApi(auth_data);
      const flush_data = {type: 'domain', allServers: 1, entry: 'zboxapp.dev'};
      api.flushCache(flush_data, function(err, data){
        if (err) console.log(err);
        expect(err).to.not.exist;
        done();
      })
    });

    it('should get all domains', function(done) {
      let api = new ZimbraAdminApi(auth_data);
      api.getAllDomains(function(err, data){
        if (err) console.log(err);
        expect(data.domain[0].constructor.name).to.equal('Domain');
        done();
      });
    });

    it('should get all domains as an Object', function(done) {
      let auth_data_tmp = Object.assign({}, auth_data)
      auth_data_tmp.arrayAsObject = true;
      auth_data_tmp.arrayAsObjectKey = 'name';
      let api = new ZimbraAdminApi(auth_data_tmp);
      api.getAllDomains(function(err, data){
        if (err) console.log(err);
        expect(data.domain['customer.dev']).to.exist;
        done();
      });
    });

    it('should get all accounts', function(done) {
      // var callback = sinon.spy();
      let api = new ZimbraAdminApi(auth_data);
      api.getAllAccounts(function(err, data){
        if (err) console.log(err);
        expect(data.account[0].constructor.name).to.equal('Account');
        done();
      });
    });

    it('should get all accounts as an Object', function(done) {
      let auth_data_tmp2 = Object.assign({}, auth_data)
      auth_data_tmp2.arrayAsObject = true;
      let api = new ZimbraAdminApi(auth_data_tmp2);
      api.getAllAccounts(function(err, data){
        if (err) console.log(err);
        expect(Object.keys(data.account)[0]).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
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
        'url': zimbraURL,
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
      api.countAccounts('empty.com', function(err, data){
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
      };
      api.login(getCallback);
    });

    it('Should return errors for BatchRequest', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.client.options.timeout = 5000;
      const getAllAccounts = api.directorySearch({types: 'account'});
      const deleteAccount = api.removeAccount('pollotron@example.com');
      const getAllDomains = api.directorySearch({types: 'domains'});
      api.login(function(err, data){
        api.makeBatchRequest([deleteAccount, getAllDomains, getAllAccounts], function(err, data){
          expect(data.errors.length).to.be.above(1);
          expect(data.errors[0].constructor.name).to.equal('Error');
          expect(data.errors[0].extra.code).to.exist;
          expect(data.errors[1].extra.reason).to.exist;
          done();
        }, {onError: 'continue'});
      });
    });

  });

  describe('Account tests', function() {
    this.timeout(10000);

    it('should return the account membership', function(done){
      const account = 'admin@zboxapp.dev';
      let api = new ZimbraAdminApi(auth_data);
      api.getAccountMembership(account, function(err, data){
        if (err) return console.log(err);
        expect(data[0].constructor.name).to.be.equal('DistributionList');
        done();
      });
    });

    it('should return the account membership when used as account method', function(done){
      const account = 'admin@zboxapp.dev';
      let api = new ZimbraAdminApi(auth_data);
      api.getAccount(account, function(err, account){
        if (err) return console.log(err);
        account.getAccountMembership(function(err, data){
          if (err) return console.log(err);
          expect(data[0].constructor.name).to.be.equal('DistributionList');
          done();
        });
      })
    });

    it('should return OK if the account membership is empty', function(done){
      const account = 'pbruna@itlinux.cl';
      let api = new ZimbraAdminApi(auth_data);
      api.getAccountMembership(account, function(err, data){
        if (err) return console.log(err);
        console.log(data);
        expect(data.length).to.be.equal(0);
        done();
      });
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
      api.getAccount('cos_basic_13@customer.dev', function(err, data){
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
      api.getAccount('cos_basic_13@customer.dev', function(err, data){
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

    // it('Should enable the account Archiving', function(done){
    //   let account_name = Date.now() + '@zboxtest.com';
    //   let account_password = Date.now();
    //   let api = new ZimbraAdminApi(auth_data);
    //   api.createAccount(account_name, account_password, {}, function(err, account){
    //     if (err) return console.log(err);
    //     account.enableArchiving('default', function(err, account){
    //       if (err) return console.log(err);
    //       expect(account.archiveEnabled).to.be.true;
    //       expect(account.attrs.zimbraArchiveAccount).to.match(/com\.archive$/);
    //       done();
    //     });
    //   });
    // });
    //
    // it('Should disable the account Archiving', function(done){
    //   let account_name = Date.now() + '@zboxtest.com';
    //   let account_password = Date.now();
    //   let api = new ZimbraAdminApi(auth_data);
    //   api.createAccount(account_name, account_password, {}, function(err, account){
    //     if (err) return console.log(err);
    //     account.enableArchiving('default', function(err, account){
    //       if (err) return console.log(err);
    //       account.disableArchiving(function(err, account){
    //         if (err) return console.log(err);
    //         expect(account.archiveEnabled).to.be.false;
    //         expect(account.attrs.zimbraArchiveAccount).to.match(/com\.archive$/);
    //         done();
    //       });
    //     });
    //   });
    // });


  });

  describe('Domain tests', function() {
    this.timeout(5000);

    it('Should return if the domain is an alias Domain', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getDomain('reseller.alias', function(err, data){
        if (err) return console.log(err);
        expect(data.isAliasDomain).to.be.true;
        expect(data.masterDomainName).to.be.equal('reseller.dev');
        done();
      });
    });

    it('Should return false if the domain is not an alias Domain', function(done){
      let api = new ZimbraAdminApi(auth_data);
      api.getDomain('reseller.dev', function(err, data){
        if (err) return console.log(err);
        expect(data.isAliasDomain).to.be.false;
        expect(data.masterDomainName).to.be.undefined;
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
      api.getDomain('customer.dev', function(err, domain){
        if (err) console.error(err);
        api.getCos("basic", function(err, cos){
          if (err) console.error(err);
          const cosMax = {"zimbraDomainCOSMaxAccounts": `${cos.id}:200`};
          api.modifyDomain(domain.id, cosMax, function(err, data){
            if (err) console.error(err);
            api.getDomain('customer.dev', function(err, domain){
              domain.countAccounts(function(err, d){
                if (err) console.error(err);
                expect(d.basic.limit).to.be.above(1);
                done();
              });
            })
          })
        })

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
      let domain_admin = Date.now() + '@customer.dev';
      let resource_name = Date.now() + '.dev';
      api.createAccount(domain_admin, '12dda.222', {},  function(err, account){
        if (err) return console.error(err);
        api.createDomain(resource_name, {}, function(err, data){
          if (err) console.error(err);
          let domain = data;
          const coses = ['basic', 'premium'];
          domain.addAdmin(account.id, coses,  function(e, d){
            if (e) return console.error(e);
            expect(err).to.be.null;
            d.getACLs(function(e, acls){
              if (e) return console.error(e);
              const expectedGrants = ["domainAdminRights", "set.dl.zimbraACE"];
              const actualGrants = acls.map(function(acl){return acl.rightName}).sort()
              expect(expectedGrants[0]).to.be.equal(actualGrants[0]);
              expect(expectedGrants[2]).to.be.equal(actualGrants[2]);
              d.getAdmins(function(e, admins){
                if (e) return console.error(e);
                expect(admins.account[0].name).to.be.equal(domain_admin);
                done();
              })
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
        domain.addAdmin(domain_admin, [], function(e, d){
          domain.removeAdmin(domain_admin, [], function(e, d){
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

    it('Should Return the DL membership', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let dl_name = Date.now() + '@zboxapp.dev';
      const attributes = {};
      api.createDistributionList(dl_name, attributes, function(err, dl){
        if (err) return console.error(err);
        api.addDistributionListMember(dl.id, ['abierta@customer.dev'], (err, data) =>{
          if (err) return console.error(err);
          api.getDistributionListMembership('abierta@customer.dev', {}, function(err, dls){
            if (err) return console.error(err);
            expect(dls.length).to.be.above(0);
            expect(dls[0].constructor.name).to.be.equal('DistributionList');
            done();
          })
        });
      });
    });

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

    it('AddDistributionListAlias should add the alias', function(done){
      let api = new ZimbraAdminApi(auth_data);
      let alias = Date.now() + '@itlinux.cl';
      api.getDistributionList('abierta@customer.dev', function(err, data){
        let dl = data;
        api.addDistributionListAlias(dl.id, alias, function(err, data){
          if (err) return console.error(err);
          expect(err).to.be.null;
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
        dl.addOwner(owner_email, function(e, dl){
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
          d.removeOwner(owner_email, function(e, d){
            d.getACLs(function(e, d){
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
