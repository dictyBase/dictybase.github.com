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
Data that will be imported is in the format explained [here](/stock-data-export)

## Rationale & SQL

### Inventories
* The inventory data available for import is one inventory per row. Inventory being a property of the stock is stored in the `stockprop` table. 
* We also have ontologies that explain the terms used to define a strain or a plasmid inventory. The ontologies are available here: [strain](https://github.com/dictyBase/migration-data/blob/master/ontologies/strain_inventory.obo) & [plasmid](https://github.com/dictyBase/migration-data/blob/master/ontologies/plasmid_inventory.obo). These ontologies can be loaded using [obo-loader](/obo-loader).
* As defined in the ontologies;
   * strain-inventory - A stock is said to have a strain inventory when it has `location, color, storage date, number of vials, obtained as, stored as, private comment, public comment`
   * plasmid-inventory - A stock is said to have a plasmid inventory when it has `location, color, storage date, obtained as, stored as, private comment, public comment`
* The inventory data is stored in the database as follows;
   * `stockprop.type => { in => [qw/<terms from inventory ontologies>/]}` & `stockprop.value => <value of the term from ontology>`
* Same `stockprop.rank` for each *DBS-ID*/*DBP-ID* is one inventory record.

Once data is imported, it can be viewed/retrieved using the following SQL;
```sql
SELECT s.uniquename dbs_id, cvt.name inventory_prop, sp.value, sp.rank
FROM stockprop sp
JOIN stock s ON s.stock_id = sp.stock_id
JOIN cvterm typ ON typ.cvterm_id = s.type_id
JOIN cvterm cvt ON cvt.cvterm_id = sp.type_id
JOIN cv ON cv.cv_id = cvt.cv_id
WHERE cv.name = 'strain_inventory'
AND typ.name IN ('strain', 'plasmid')
ORDER BY s.uniquename, sp.rank, cvt.name;
```

### Strain-Plasmid
* Strains have plasmids associated with it. Some of these plasmids are available in the Dicty StockCenter, while some are not.
* The plasmids that are not currently available in the Stock Center, may or may not be available in the future. Thus, we use the same data model as the one's available. The only difference is `stockcollection.name => 'Dicty Azkaban'` 
* If ever, these plasmids are made available we can change `stockcollection.name => Dicty Stockcenter`
* For storing the relation we use the `stock_relationship` table.   
   * `stock_relationship.subject_id => stock.stock_id (plasmid)` & `stock_relationship.object_id => stock.stock_id (strain)`. The relation term used is `part_of` which is defined under `cv.name => 'stock_relation'`. 

Once data is imported, it can be viewed/retrieved using the following SQL;
```sql
SELECT DISTINCT sbj.name plasmid_name, sbj.uniquename dbp_id, ssc.name plasmid_stockcollection, rel.name relation_term, obj.name strain_name, obj.uniquename dbs_id, osc.name strain_stockcollection
FROM stock_relationship srel 
JOIN stock obj ON obj.stock_id = srel.object_id
JOIN cvterm styp ON styp.cvterm_id = obj.type_id
JOIN stock sbj ON sbj.stock_id = srel.subject_id
JOIN cvterm ptyp ON ptyp.cvterm_id = sbj.type_id
JOIN stockcollection_stock oscs ON oscs.stock_id = obj.stock_id
JOIN stockcollection osc ON osc.stockcollection_id = oscs.stockcollection_id
JOIN stockcollection_stock sscs ON sscs.stock_id = sbj.stock_id
JOIN stockcollection ssc ON ssc.stockcollection_id = sscs.stockcollection_id
JOIN cvterm rel ON rel.cvterm_id = srel.type_id
WHERE styp.name = 'strain'
AND ptyp.name = 'plasmid'
ORDER BY sbj.name, sbj.uniquename, ssc.name;
```

### Strain-Genes
* Strains are associated with genes (features). The relation is mainly based on the genotype, which is common to the strain & the gene. Thus the link between a strains (stock) and a gene (feature) can be modeled using the genotype.
* From our data, one strain has one genotype. However, the relation between strains & genes is many-to-many.
   * `stock -> stock_genotype -> genotype -> feature_genotype -> feature`
* `feature_genotype` requires `cgroup`, `chromosome_id` and `cvterm_id`, which is not modeled yet. 

Once data is imported, it can be viewed/retrieved using the following SQL;
```sql
SELECT s.uniquename dbs_id, d.accession ddbg_id
FROM stock s
JOIN cvterm str ON str.cvterm_id = s.type_id
JOIN stock_genotype sg ON sg.stock_id = s.stock_id
JOIN genotype g ON g.genotype_id = sg.genotype_id
JOIN feature_genotype fg ON fg.genotype_id = g.genotype_id
JOIN feature f ON f.feature_id = fg.feature_id
JOIN dbxref d ON d.dbxref_id = f.dbxref_id
JOIN cvterm gene ON gene.cvterm_id = f.type_id
WHERE gene.name = 'gene'
AND str.name = 'strain';
```

### Publications & Strain characteristics
* All publication entries have been exported as PMIDs.    
* Initially available in EndNote, the stockcenter publications have been converted to [BibTeX formet](https://github.com/dictyBase/migration-data/blob/master/publications/dicty_refs_feb2012.bib). This will be loaded using loader written for [chadopub2bib](https://github.com/dictyBase/Modware-Loader/blob/develop/lib/Modware/Export/Command/chadopub2bib.pm).
* Data import is pretty straight-forward. Data is stored in `stock_pub` linking table.

Once data is imported, it can be viewed/retrieved using the following SQL;
```sql
SELECT s.uniquename stock_id, pub.uniquename pmid
FROM stock_pub sp
JOIN stock s ON s.stock_id = sp.stock_id
JOIN pub ON pub.pub_id = sp.pub_id;
```

* Similarly, the model for strain characteristics is very straight-forward. Make sure you have the [strain_characteristics](https://github.com/dictyBase/migration-data/blob/master/ontologies/strain_characteristics.obo) ontology loaded.
* The linking table is `stock_cvterm`.

Once data is imported, it can be viewed/retrieved using the following SQL;
```sql
SELECT s.uniquename stock_id, cvt.name characteristic
FROM stock_cvterm scvt
JOIN stock s ON s.stock_id = scvt.stock_id
JOIN cvterm cvt ON cvt.cvterm_id = scvt.cvterm_id;
```

### Parental strains
* The model for parental strains is the same as [strain-plasmids](#strain-plasmid).
* The only difference is:
   `stock_relationship.subject_id => stock.stock_id (parent)`. And the relation term used is `is_parent_of` from `cv.name => 'stock_relation'`.

```sql
SELECT DISTINCT sbj.name parent_strain, sbj.uniquename dbs_id, rel.name relation_term, cv.name cv_name, obj.name strain_name, obj.uniquename dbs_id
FROM stock_relationship srel 
JOIN stock obj ON obj.stock_id = srel.object_id
JOIN cvterm styp ON styp.cvterm_id = obj.type_id
JOIN stock sbj ON sbj.stock_id = srel.subject_id
JOIN cvterm ptyp ON ptyp.cvterm_id = sbj.type_id
JOIN cvterm rel ON rel.cvterm_id = srel.type_id
JOIN cv ON cv.cv_id = rel.cv_id
WHERE styp.name = 'strain'
AND ptyp.name = 'strain'
ORDER BY sbj.name, sbj.uniquename;
```

### Phenotype
* Phenotype is an important data component. It is something that is observed for a given `genotype`. Like explained in [stock data export](/stock-data-export), it is dependent on `genotype` and `environment`
* The way it is modeled is the same as legacy.
* The ontologies that required to be loaded before importing this data; [Dicty Phenotypes](https://github.com/dictyBase/migration-data/blob/master/ontologies/dicty_phenotypes.obo), [Dicty Environment](https://github.com/dictyBase/migration-data/blob/master/ontologies/dicty_environment.obo), [Dictyostelium Assay](https://github.com/dictyBase/migration-data/blob/master/ontologies/dicty_assay.obo).
* The model for phenotype is based on the following concept;
   * `strain` has a `genotype`. This `genotype`, under certain `environment` expresses to show `phenotype`. 

Once data is imported, it can be viewed/retrieved using the following SQL;
```sql
SELECT s.uniquename dbs_is, g.name genotype, phen.name phenotype, e.description environment
FROM phenstatement pst
JOIN genotype g ON g.genotype_id = pst.genotype_id
JOIN stock_genotype sg ON sg.genotype_id = g.genotype_id
JOIN stock s ON s.stock_id = sg.stock_id
JOIN cvterm typ ON typ.cvterm_id = s.type_id
JOIN phenotype p ON p.phenotype_id = pst.phenotype_id
JOIN cvterm phen ON phen.cvterm_id = p.observable_id
JOIN environment e ON e.environment_id = pst.environment_id
WHERE typ.name = 'strain';
```

### Plasmid Sequence
* The plasmid sequences are available for import in either GenBank or FastA formats. 
* With this import, we convert GenBank to FastA and import only FastA sequences. 
* The plasmid sequences are stored in `feature` table. Default `uniquename` & `dbxref.accession` is *DBP-ID*. 
* In case of GenBank, the GenBank accession is the `dbxref.accession`. 
* Also an entry is made in the `stockprop` table for each plasmid that has a sequence. 
   * The `stockprop.type => 'plasmid_vector'` & the `stockprop.value => feature_id`. 
* Also as plasmids do not have an organism defined (also not enough metadata available for a different kind of data model), default is *Dictyostelium discoideum*.
* For importing the sequences, param `--seq_data_dir` needs to be passed a path to [folder](https://github.com/dictyBase/migration-data/tree/master/plasmid/formatted_sequence) with clean/formatted sequence files.

### Plasmid Genes
* Plasmids has genes associated with it (from legacy data). However, all the data about the sequence & loci is not available.
* Had the sequence data been available, a diffeent data model would have been adopted.
* Currently, the genes associated with plasmids are stored in the `stockprop` table
   * `stockprop.type => 'has_part'`. `has_part` is from `sequence` ontology.
   * `stockprop.value => DDB_G-ID`

Once data is imported, it can be viewed/retrieved using the following SQL;
```sql
SELECT DISTINCT s.uniquename dbp_id, typ.name relation, sp.value ddbg_id
FROM stockprop sp
JOIN stock s ON s.stock_id = sp.stock_id
JOIN cvterm typ ON typ.cvterm_id = sp.type_id
WHERE sp.value LIKE 'DDB_G%';
```

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
$>
```

```bash
$>
```

To run the command

```perl
# Import plasmid data
$> modware-import dictyplasmid2chado2 -c plasmid_import.yaml 
$> modware-import dictyplasmid2chado2 -c plasmid_import.yaml --data inventory --data props # For specific imports 
$> modware-import dictyplasmid2chado2 -c plasmid_import.yaml --seq_data_dir <seq-data-dir> # For sequence 

# Import strain data
$> modware-import dictystrain2chado2 -c strain_import.yaml 
$> modware-import dictystrain2chado2 -c strain_import.yaml --prune --mock_pubs # Options to prune or mock publications 
$> modware-import dictystrain2chado2 -c strain_import.yaml --data inventory --data genotype # For specific imports 
```

**NOTE:** *Plasmid data will have to be imported before the strain data. This is because the strain-plasmids depend on the plasmid records*

