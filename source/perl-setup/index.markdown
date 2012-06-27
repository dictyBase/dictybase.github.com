---
layout: page
title: "Setting up perl environment for development"
date: 2012-06-21 12:23
sharing: true
footer: true
enlist: true
---


### Install perlbrew 
[Perlbrew](http://perlbrew.pl) will be used to install and manage different version of
stable perl releases. This OS installed perl will be left untouched.

```bash
curl -kL http://install.perlbrew.pl | bash
```
Then follow the instruction in the screen. The above command will set up perlbrew for
majority of the cases. For more details of if it fails look  [here](http://perlbrew.pl/). 
For system wide or custom installation look
[here](https://metacpan.org/module/perlbrew#CONFIGURATION).


### Install perl using perlbrew
By default we use [perl-5.10.1](https://metacpan.org/release/DAPM/perl-5.10.1),  however other versions
namely perl-5.12.4, perl-5.14.2, perl-5.16.0 will be fine. A simple 

```
perlbrew list
```

will show you the list of perls that can be installed.

```bash
perlbrew install -j 4 perl-5.10.1
perlbrew alias create perl-5.10.1 deploy-perl
perlbrew switch deploy-perl
```

### Install friends of perl
These are highly recommended modules primarilly to manage dependencies. 

```bash
perlbrew install-cpanm
cpanm -n App::cpanoutdated App::pmuninstall Carton
```
__Note:__ The (-n) option is used for faster module installation as it skips the unit
testing. 
Look [here](https://metacpan.org/module/Task::Kensho) for a list highly recommended
modules by community used for perl development.



### Managing modules

##### Creating sandbox
Always create a project specific local lib environment(sandbox) for managing module dependencies.
```bash
perlbrew lib create project_name
perlbrew use perl_name@project_name
```

##### Installation
```
perlbrew use perl_name@project_name
cpanm -n some_module_name
```

##### Update
```bash
cpan-outdated -p | cpanm -n
```

##### Uninstall
```bash
pm-uninstall some_module_name
```
