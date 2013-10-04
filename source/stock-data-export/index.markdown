---
layout: page
title: "Stock Data Export"
date: 2013-10-04 16:07
comments: true
sharing: true
footer: true
author: Yogesh Pandit
---

Stock at dictyBase.org consists of strains & plasmids.  Currently, the data resides in Oracle under a custom schema. The different types of data associated with stocks are 

```yaml
stock:
	strain:
		inventory, genotype, phenotype, characteristics, publications, parental strain, strain-plasmids,
	
	plasmid:
		inventory, publications, sequences 
```

The data is being exported using the `modware-dump` command. The command look like this;

```bash
modware-dump 
Available commands:

	commands: list the application's commands
	    help: display a command's help screen

dictyplasmid: Dump data for dicty plasmids
 dictystrain: Dump data for dicty strains
```

The options common for both commands are

```bash
	-c --configfile               yaml config file to specify all command line options
	-d --dir                      Folder under which input and output files can be 
									configured to be written
	-i --input                    Name of the input file
	-h -? --usage --help          Prints this usage information.
	-o --output                   Name of the output file
	--log_level                   Log level of the logger,  default is error
	--attr --attribute            Additional database attribute
	--dsn                         database DSN
	-u --user                     database user
	-l --logfile                  Name of logfile,  default goes to STDERR
	--pass -p --password          database password
	--legacy_dsn                  Legacy database DSN
	-u --legacy_user              Legacy database user
	--pass -p --legacy_password   Legacy database password
```

```bash
modware-dump dictystrain [-?cdhiloppuu] [long options...]
    --data                        Option to dump all data (default) or (strain, 
									inventory, genotype, phenotype, publications, 
									genes, characteristics, props, parent, plasmid)
```

```bash
modware-dump dictyplasmid [-?cdhiloppuu] [long options...]
	--data                        Option to dump all data (default) or (plasmid, inventory, 
	                              	genbank, publications, genes, props)
	--sequence                    Option to fetch sequence in Genbank format and write to file
```
