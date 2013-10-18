---
layout: page
title: "stock data import"
date: 2013-10-04 17:13
comments: true
sharing: true
footer: true
toc: true
author: Yogesh Pandit
---

## Data
Data the will be imported is in the format explained [here](/stock-data-export)

## Rationale & SQL

### Inventories

### Strain-Plasmid

### Plasmid Sequence
* The plasmid sequences are available for import in either GenBank or FastA formats. 
* With this import, we convert GenBank to FastA and import only FastA sequences. 
* The plasmid sequences are stored in `feature` table. Default `uniquename` & `dbxref.accession` is *DBP-ID*. 
* In case of GenBank, the GenBank accession is the `dbxref.accession`. 
* Also an entry is made in the `stockprop` table for each plasmid that has a sequence. 
* The `stockprop.type => 'plasmid_vector'` & the `stockprop.value => feature_id`. 
* Also as plasmids do not have an organism defined (also not enough metadata available for a different kind of data model), default is *Dictyostelium discoideum*.

### Plasmid Genes
* Plasmids has genes associated with it (from legacy data). However, all the data about the sequence & loci is not available.
* Had the sequence data been available, a diffeent data model would have been adopted.
* Currently, the genes associated with plasmids are stored in the `stockprop` table
   * `stockprop.type => 'has_part'`. `has_part` is from `sequence` ontology.
   * `stockprop.value => DDB_G-ID`

## Command
The data is being imported using the [`modware-import`](https://github.com/dictyBase/Modware-Loader/blob/develop/bin/modware-import) command. All the modules used by this command can be found under [`Modware::Import`](https://github.com/dictyBase/Modware-Loader/tree/develop/lib/Modware/Import) and [`Modware::Role::Stock::Import`](https://github.com/dictyBase/Modware-Loader/tree/develop/lib/Modware/Role/Stock/Import)
The command looks like this;

```bash
$> modware-import
Available commands:

	      commands: list the application's commands
	          help: display a command's help screen

dictyplasmid2chado: Command to import plasmid data from dicty stock
 dictystrain2chado: Command to import strain data from dicty stock

```

The options common for both commands are

```bash
	-c --configfile               yaml config file to specify all command line options
	-d --dir                      Folder under which input and output files can be 
									configured to be written
	-i --input                    Name of the input file
	-h -? --usage --help          Prints this usage information.
	--log_level                   Log level of the logger,  default is error
	-u --user                     database user
	--pass -p --password          database password
	-l --logfile                  Name of logfile,  default goes to STDERR
	--prune
	--mock_pubs
```

Options specific to the commands:

```bash

```

```bash

```

To run the command

```perl
# Import plasmid data
modware-import dictyplasmid2chado2 -c plasmid_import.yaml 
modware-import dictyplasmid2chado2 -c plasmid_import.yaml --data inventory --data props # For specific imports 
modware-import dictyplasmid2chado2 -c plasmid_import.yaml --seq_data_dir <seq-data-dir> # For sequence 

# Import strain data
modware-import dictystrain2chado2 -c strain_import.yaml 
modware-import dictystrain2chado2 -c strain_import.yaml --prune --mock_pubs # Options to prune or mock publications 
modware-import dictystrain2chado2 -c strain_import.yaml --data inventory --data genotype # For specific imports 
```
