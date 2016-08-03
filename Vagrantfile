# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://atlas.hashicorp.com/search.
  config.vm.box = "bento/centos-7.2"
  config.ssh.insert_key = false

  # Compartir directorio de desarollo de Zimlets

  config.vm.provision "ansible" do |ansible|
    ansible.playbook = 'vagrant/provision/playbook.yml'
    ansible.sudo = true
  end

  config.vm.network 'private_network', ip: '192.168.50.10'
  config.vm.hostname = 'zimbra.zboxapp.dev'
  config.vm.network 'forwarded_port', guest: 7071, host: 7071
  config.vm.network 'forwarded_port', guest: 8081, host: 6081
  config.vm.network 'forwarded_port', guest: 9081, host: 9081
  config.vm.network 'forwarded_port', guest: 443, host: 7443
  config.vm.network 'forwarded_port', guest: 80, host: 7080
  config.vm.network 'forwarded_port', guest: 27017, host: 27017


  config.vm.provider 'virtualbox' do |v|
    v.name = 'newManagerZimbra'
    v.memory = 2048
    v.cpus = 2
  end

  config.vm.provider 'parallels' do |v|
    v.name = 'newManagerZimbra'
    v.memory = 2048
    v.cpus = 2
  end
end
