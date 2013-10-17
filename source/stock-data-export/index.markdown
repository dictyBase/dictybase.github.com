---
layout: page
title: "Stock Data Export"
date: 2013-10-04 16:07
comments: true
sharing: true
footer: true
enlist: true
toc: true
author: Yogesh Pandit
---

## Why?
Stock at dictyBase.org consists of strains & plasmids.  Currently, the data resides in Oracle under a custom schema. Objectives behind this export (and eventual import) 

* to bring the data under a standard Chado schema.  
* to clean/merge/format data.
   * each entry has multiple kinds of references (pubmed, internal reference, other references)
   * data exists in 2 tables and is neither linked nor in sync (strain-plasmid & plasmid)
   * abbreviations not linked to full forms (mutagenesis method)
   * improper spacing & linebreaks (some Windows-style)
* to correct data model for inventories, phenotype, strain-feature links etc.

## Data
Different kinds of data that are exported as a part of stock are represented in JSON below.
```json
{
	"stock": {
		"strain": ["inventory", "genotype", "phenotype", 
			"characteristics", "publications", "parental strain", 
			"strain-plasmids"],
		"plasmid": ["inventory", "publications", "sequences",
			"plasmid map"]
	}
}
```

The data is exported in TAB delimited files. Structure of exported data looks like
```json
{
	"stock": {
		"strain": {
			"strain": ["dbs_id", "strain_name", "organism", "strain_description"],
			"inventory": ["dbs_id", "location", "color", "no_of_vials", "obtained_as", 
				"stored_as", "storage_date", "private_comment", "public_comment"],
			"publications": ["dbs_id", "pmid"],
			"characteristics": ["dbs_id", "characteristic"],
			"genotype": ["dbs_id", "dsc_g_id", "genotype"],
			"phenotype": ["dbs_id", "phenotype", "environment", "assay", 
				"pmid", "phenotype_note"],
			"strain-plasmid": ["dbs_id", "dbp_id"/"plasmid_name"],
			"strain-feature": ["dbs_id", "ddb_g_id"],
			"parent": ["dbs_id", "dbs_id_parent"/"strain_name_parent"],
			"props": ["dbs_id", "prop_type", "prop_value"]
		},
		"plasmid": {
			"plasmid": ["dbp_id", "plasmid_name", "plasmid_description"],
			"inventory": ["dbp_id", "location", "color", "stored_as", 
				"storage_date", "public_comment"],
			"publications": ["dbp_id", "pmid"],
			"plasmid-feature": ["dbp_id", "ddb_g_id"],
			"props": ["dbp_id", "prop_type", "prop_value"],
			"genbank": ["dbp_id", "genbank_accesion"],
		}
	}
}
```

## Rationale & SQL

### Inventory
Inventory is a property of the stock (strain/plasmid). In the legacy schema, the inventory information sits in a table of its own. With this export, the inventory will be controlled by ontologies ([strain_inventory.obo](https://github.com/dictyBase/migration-data/blob/master/ontologies/strain_inventory.obo), [plasmid_inventory.obo](https://github.com/dictyBase/migration-data/blob/master/ontologies/plasmid_inventory.obo) & [storage_condition.obo](https://github.com/dictyBase/migration-data/blob/master/ontologies/storage_condition.obo)).  

```sql
/* Strain inventory */
SELECT d.accession, sci.location, sci.color, sci.no_of_vials, sci.obtained_as, sci.stored_as, sci.storage_date, sci.storage_comments private_comment, sci.other_comments_and_feedback public_comment
FROM CGM_DDB.stock_center_inventory sci
JOIN CGM_DDB.stock_center sc ON sc.id = sci.strain_id
JOIN CGM_CHADO.dbxref d ON d.dbxref_id = sc.dbxref_id;

/* Plasmid inventory */
SELECT p.id, pi.location, pi.color, pi.stored_as, pi.storage_date, pi.other_comments_and_feedback public_comment
FROM CGM_DDB.plasmid_inventory pi
JOIN CGM_DDB.plasmid p ON p.id = pi.plasmid_id;
```

### Phenotype
Phenotype is something that is observed. Each strain has a genotype which on expression under certain environment shows the phenotype. Thus, the data model for phenotype involves genotype, environment and the pubmed reference. It also optionally involves the assay information. Following SQL retrieves the phenotype information,

```sql
SELECT g.uniquename, phen.name, env.name, assay.name, pub.uniquename, p.value
FROM phenstatement pst
LEFT JOIN genotype g on g.genotype_id = pst.genotype_id
LEFT JOIN cvterm env on env.cvterm_id = pst.environment_id
LEFT JOIN cv env_cv on env_cv.cv_id = env.cv_id
LEFT JOIN phenotype p on p.phenotype_id = pst.phenotype_id
LEFT JOIN cvterm phen on phen.cvterm_id = p.observable_id
LEFT JOIN cvterm assay on assay.cvterm_id = p.assay_id
LEFT JOIN cv assay_cv on assay_cv.cv_id = assay.cv_id
LEFT JOIN pub on pub.pub_id = pst.pub_id
ORDER BY g.uniquename, pub.uniquename, phen.name;
```

From the above SQL, `phen.name`, `env.name` & `assay.name` are terms from ontologies viz. `Dicty Phenotypes`, `Dicty Environment` & `Dictyostelium Assay` respectively. Read about ontology loading [here](/obo-loading)

### Props, Publications & Characteristics
Props are additional information for the stock (in this case). For strains, we have props like 'mutagenesis method', 'mutant type' & 'synonym'. And for plasmids, thr props are 'keyword', 'depositor' & 'synonym'. 

Stocks have associated publications. Mainly the publications are PubMed IDs. However, stocks have some unresolvable internal references. With this export, these internal references are cleaned up and brought down a standard, PubMed. While exporting publications redundant/duplicate entries were thrown out and the data is exported as a TAB delimited file with 2 columns; *DBS_ID* & *PMID*

The characteristics are strain characteristics. It is maintained as an [ontology](https://github.com/dictyBase/migration-data/blob/master/ontologies/strain_characteristics.obo). Strain characteristics are exported as a 2 column TAB delimited file; *DBS_ID* & *Characteristic Term*

### Parental strain & Strain-Plasmid
Parental strains, as the name suggests, are parents of the strain records. There are only a few parents for *Dictyostelium discoideum*. However, depending on when these parents were submitted to the Dicty Stock Center and by whom, they can have multiple records in the database. So the issue is that a [strain can be linked to multiple entries of the same parent](https://github.com/dictyBase/Modware-Loader/issues/62). So now, we will be added generic strains to resolve this issue. All strains with parents with multiple IDs will point to only one generic strain. Currently data is exported in 2 columns; *DBS_ID* & *DBS_ID of parent*

In case of strain-plasmids, there are [strain-plasmid entries that are not real plasmids](https://github.com/dictyBase/Modware-Loader/issues/63) in the Dicty Stock Center. When the plasmid entri exists, the 2nd column exported is the DBP_ID, otherwise it is the `plasmid_name`. This issue is resolved with the stock data import

### Plasmid sequence
The plasmid sequences are served from static files, currently. These sequences have been cleaned by running it through `Bio::SeqIO` and some manually. The files names are the database IDs for plasmids. The raw, pre-processed data can be found [here](https://github.com/dictyBase/migration-data/tree/master/plasmid/raw_sequence). This is the input for `--sequence` parameter of [`modware-dump dictyplasmid`](#running-the-command). The data is exported in `sequence` subdirectory of output directory. The file names are *DBP-ID*s and extension is the data format (genbank/fasta).

## Command 
The data is being exported using the [`modware-dump`](https://github.com/dictyBase/Modware-Loader/blob/develop/bin/modware-dump) command. All the modules used by this command can be found under [`Modware::Dump`](https://github.com/dictyBase/Modware-Loader/tree/develop/lib/Modware/Dump) or [`Modware::Role::Stock::Export`](https://github.com/dictyBase/Modware-Loader/tree/develop/lib/Modware/Role/Stock/Export). The command looks like this;

```bash
$> modware-dump 
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
$> modware-dump dictystrain [-?cdhiloppuu] [long options...]
    --data                        Option to dump all data (default) or (strain, 
									inventory, genotype, phenotype, publications, 
									genes, characteristics, props, parent, plasmid)
```

```bash
$> modware-dump dictyplasmid [-?cdhiloppuu] [long options...]
	--data                        Option to dump all data (default) or (plasmid, inventory, 
	                              	genbank, publications, genes, props)
	--sequence                    Option to fetch sequence in Genbank format and write to file
```

### Running the commands

```perl
# Export strain data
$_> modware-dump dictystrain -c strain_export.yaml --output_dir <folder-to-export-data> # This will dump all data
$_> modware-dump dictystrain -c strain_export.yaml --data genotype --data inventory --data genes --data publications # Specific exports

# Export plasmid data
$_> modware-dump dictyplasmid -c plasmid_export.yaml --output_dir <folder-to-export-data> # This will dump all data
$_> modware-dump dictyplasmid -c plasmid_export.yaml --data genbank --data genes # Specific exports
$_> modware-dump dictyplasmid -c plasmid_export.yaml --sequence # Export plasmid sequences in FastA/GenBank
```
