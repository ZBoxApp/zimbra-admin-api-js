# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
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
  config.vm.network 'forwarded_port', guest: 443, host: 7443
  config.vm.network 'forwarded_port', guest: 80, host: 7080


  config.vm.provider 'virtualbox' do |v|
    v.name = 'zimbra-admin-api-js'
    v.memory = 2048
    v.cpus = 2
  end

  config.vm.provider 'parallels' do |v|
    v.name = 'zimbra-admin-api-js'
    v.memory = 2048
    v.cpus = 2
  end
end
