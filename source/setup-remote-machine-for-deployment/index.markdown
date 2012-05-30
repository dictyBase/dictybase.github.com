---
layout: page
title: "Setup remote machine for deployment"
date: 2012-05-30 11:36
comments: false
sharing: true
footer: true
author: Siddhartha Basu
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

#### Install perlbrew and perl
Installation of perlbrew is documented [here](http://perlbrew.pl/). For perl use
[perl-5.12.4](https://metacpan.org/release/LBROCARD/perl-5.12.4),  however other versions
namely perl-5.10.1, perl-5.14.2,  perl-5.16.0 will be fine. 

```bash
perlbrew install -j 4 perl-5.12.4
perlbrew alias perl-5.12.4 deploy-perl
perlbrew switch deploy-perl
```

#### Install friends of perlbrew
This is mostly for installing perl modules to manage dependencies. They
should be installed with any new installation of perl.

```bash
perlbrew install-cpanm
cpanm -n App::cpanoutdated App::pmuninstall 
```
__Note:__ The (-n) option is used for faster module installation as it skips the unit
testing. 


#### Managing modules
Always create a project specific local lib environment(sandbox) for managing module dependencies.
```bash
perlbrew lib create project_name
perlbrew use perl_name@project_name
```

Installation
```
perlbrew use lib perl_name@project_name
cpanm -n some_module_name
```

Update
```bash
cpan-outdated -p | cpanm -n
```

Uninstall
```bash
pm-uninstall some_module_name
```

#### Install Rex
The perl [module](https://metacpan.org/module/Rex) for writing and running all deployment tasks.

First create a project specific local lib environment and install all required modules
```bash
perlbrew lib create deploy-tasks
perlbrew use lib deploy-perl@deploy-tasks
cpanm -n Rex
```

## Before we start
+ The remote box should be accessible by ssh
+ It also have to be configured for public key based SSH authentication. In short,  
```bash
ssh-keygen -t rsa
```
Then add the content of ~/.ssh/id_rsa.pub file from local machine to the ~/.ssh/authorized_keys of
remote machine.

+ Check the list of tasks that are available to run. Make sure which are mentioned to run
as sudo, pass the sudo password (-S)in the argument
```bash
rex -T
rex -H <host> -S <sudo pass> <task_name>
```

+ Create a default Rexfile and add the correct user name and ssh key credentials.
```bash
cp sample.Rexfile Rexfile
```


## Sys admin tasks
The remote deployment will be done on a remote CentOS box and so yum/rpm will be the default
package manager.

#### Add extra repositories
```bash 
rex -H <host> -S <sudo_pass> add:elrepo
```


