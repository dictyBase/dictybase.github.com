---
layout: page
title: "Installing Modware Loader"
date: 2012-10-29 14:53
comments: true
sharing: true
footer: true
enlist: true
---

[Modware-Loader](https://github.com/dictyBase/Modware-Loader) distribution provides
command line scripts to import and export data from
[chado](http://gmod.org/wiki/Introduction_to_Chado) relational database in various
formats.

* Clone the Modware-Loader [repository](https://github.com/dictyBase/Modware-Loader) and
switch to develop branch
```bash
$_> git clone git://github.com/dictyBase/Modware-Loader.git
```

* Install the dependencies 

```bash
$_> cd Modware-Loader
$_> cpanm -n Dist::Zilla
$_> dzil authordeps | cpanm -n
$_> dzil listdeps | cpanm -n
```

* Run any of __modware__ command to list the sub-commands.

```bash
$_> perl -Ilib bin/modware-export commands

modware-export <command>

Available commands:

                       commands: list the application's commands
                           help: display a command's help screen

            chado2alignmentgff3:  Export alignment from chado database in GFF3 format
            chado2canonicalgff3:  Export canonical gene models from chado database in GFF3 format
       chado2dictycanonicalgff3: Export GFF3 with canonical gene models of Dictyostelium discoideum
         chado2dictycuratedgff3: Export GFF3 with curated gene models of Dictyostelium discoideum
    chado2dictynoncanonicalgff3: Export GFF3 with sequencing center gene models of Dictyostelium discoideum
  chado2dictynoncanonicalv2gff3:  Export GFF3 with repredicted gene models of Dictyostelium discoideum
       chado2dictynoncodinggff3: Export GFF3 with non coding gene models of Dictyostelium discoideum
                    chado2fasta: Export fasta sequence file from chado database
```

* Run any of the subcommands to display its options
```bash
$_> perl -Ilib bin/modware-export chado2canonicalgff3 help

modware-export chado2canonicalgff3 [-?chlopu] [long options...]
	--write_sequence            To write the fasta sequence(s) of
	                            reference feature(s),  default is true
	-h -? --usage --help        Prints this usage information.
	--exclude_mitochondrial     Exclude mitochondrial genome,  default is
	                            to include if it is present
	--only_mitochondrial        Output only mitochondrial genome if it is
	                            present,  default is false
	-o --output                 Name of the output file,  if absent
	                            writes to STDOUT
	--feature_name              Output feature name instead of sequence
	                            id in the seq_id field,  default is off.
	--attr --attribute          Additional database attribute
	--rt --reference_type       The SO type of reference feature, 
	                            default is supercontig
	--reference_id              reference feature name/ID/accession
	                            number. In this case,  only all of its
	                            associated features will be dumped. Takes
	                            precedence over dumping with
	                            mitochondrial options
	--pass -p --password        database password
	--dsn                       database DSN
	--schema_debug              Output SQL statements that are executed, 
	                            default to false
	-u --user                   database user
	--log_level                 Log level of the logger,  default is error
	-l --logfile                Name of logfile,  default goes to STDERR
	--species                   Name of species
	--genus                     Name of the genus
	-c --configfile             yaml config file to specify all command
	                            line options
	--org --organism            Common name of the organism whose genomic
	                            features will be exported
```

More or less any subcommands containing the word dicty is specific to work with
[D.discoideum](http://dictybase.org) chado oracle database. 
