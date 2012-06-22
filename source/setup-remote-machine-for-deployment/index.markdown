---
layout: page
title: "Setup remote machine for deployment"
date: 2012-05-30 11:36
comments: false
sharing: true
footer: true
author: Siddhartha Basu
enlist: true
categories:
 - Remote virtual machine
 - Setup
 - Deployment
---


## Local machine setup
#### Clone the git repository with deploy tasks
```bash
git://github.com/dictyBase/deploy-task.git
```

#### Setup perl environment
Documented [here](/perl-setup)


#### Install Rex
The perl [module](https://metacpan.org/module/Rex) for writing and running all deployment tasks.

First create a project specific local lib environment and install all required modules
```bash
perlbrew lib create deploy-tasks
perlbrew use lib deploy-perl@deploy-tasks
cpanm -n Rex
```


## Before we start
The remote box should be accessible by ssh.

It also have to be configured for public key based SSH authentication. In short,  
```bash
ssh-keygen -t rsa
```
Then add the content of ~/.ssh/id_rsa.pub file from local machine to the ~/.ssh/authorized_keys of
remote machine.

#### Running rex tasks

Create a default Rexfile and add the correct user name and ssh key credentials.
```
cp Rexfile.sample Rexfile
```
{% include_code 'Sample rexfile' lang:perl Rexfile %}


Check the list of tasks that are available to run. Make sure which are mentioned to run
as sudo, pass the sudo password (-S)in the argument
```
rex -T
rex -H <host> -S <sudo pass> <task_name>
```

To run sudo globally,  add it to the Rexfile
{% include_code 'Rexfile with sudo on' lang:perl Rexfile_sudo %}

To run a non-default Rexfile
```
rex -H <host> -f [other_file] task_name
```


## Sys admin tasks
The remote deployment will be done on a remote CentOS box and so yum/rpm will be the default
package manager.

Add extra repositories
```bash 
rex -H <host> -s -S <sudo_pass> add:repos
```

Add extra sudoers configuration file
```bash
rex -H <host> -s -S <sudo_pass> add:sudoers --file=conf.d/sudoers.multigenome
```

Add user to developers and deploy groups
```bash
rex -H <host> -s -S <sudo_pass> add:groups --name=developer:deploy
rex -H <host> -s -S <sudo_pass> add:user --user=<user> --pass=<pass> --groups=developer:deploy
```


Install packages
```bash
rex -H <host> -s -S <sudo_pass> install:dicty-pack
```

Setup shared folder
```bash
Remember the device is expected to have a ext4 partition
rex -H <host> -s -S <sudo_pass> setup:shared-folder --group=[deploy] \ 
               --folder=[/dictybase] --device=[]
```


Oracle client setup 

  It installs the instant client rpms and sets up oracle environment
  globally. Oracle instantclient could be downloaded from
  [here](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html). For here we
  need three rpms

* oracle-instantclient-basic-10.2.0.4-1.x86_64.rpm
* oracle-instantclient-sqlplus-10.2.0.4-1.x86_64.rpm
* oracle-instantclient-devel-10.2.0.4-1.x86_64.rpm
```bash
rex -H <host> -S <sudo_pass> setup:oracle-client --rpm=rpms 
rex -H <host> -S <sudo_pass> setup:oracle:tnsnames --file=[file] \ 
    --host=[host] --sid=[sid] --service=[service_name]
```

Set daemontools
```bash
rex -H <host> -s -S <sudo_pass> setup:daemontools
```

Mojolicious web application setup
```bash
rex -H <host> -s -S <sudo_pass> setup:global-mojo --mode=[staging|production] 
```

Apache setup
```
rex -H <host> -s -S <sudo_pass> setup:apache:envvars --file=[file]
```
The following envvars have to be defined
```apache
export ASSETS_DIR=....
export WEBAPPS_DIR=...
export WEBHOST_NAME=....
export DICTYHOST_NAME=....
export MULTIGENOME_WEBROOT=....
export GBROWSE_HOST=....
```

```
rex -H <host> -s -S <sudo_pass> setup:apache:vhost --file=[file] --name=multigenome.conf
```
A minimal configuration file
{% include_code 'multigenome virtualhost configration' lang:apache multigenome.conf %}

```
rex -H <host> -s -S <sudo_pass> setup:apache:perl-code --file=[file]
```
{% include_code 'mod_perl configuration' lang:apache perl.conf %}

```
rex -H <host> -s -S <sudo_pass> setup:apache:startup
```



## Setup perl environment 
perl environment for deployment will be setup using perlbrew in the shared
folder(/dictybase).

```bash
rex -H <host> perlbrew:install --install-root=/dictybase/perl5 --system=1
rex -H <host> perlbrew:install-cpanm 
rex -H <host> perl:install-notest 
rex -H <host> perlbrew:switch --version=perl-5.10.1 
rex -H <host> perl:install-toolchain 
```
