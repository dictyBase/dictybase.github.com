---
layout: page
title: "Exporting D.discoideum annotations in GFF3 format"
date: 2012-10-29 15:31
comments: true
sharing: true
footer: true
enlist: true
---

* [Install](/install-modware-loader) modware loader

## Export genome annotations
It's done in pieces. First  canonical, curated, predicated gene models,  then alignments
and promoters. All the exports are done from inside of __Modware-Loader__ checkout.
First write down a basic yaml config file to be used for all the exports.

All the exports are done with the __name(--feature_name)__ of seq_id in GFF3 column 1.

```yaml
dsn: dbi:Oracle:database
user: username
password: password
feature_name: 1
```

### Canonical
It exports complete coding gene models along with contig and reference features. The gene models
could be either of __curated__ or __predicted__ from sequencing center.

```bash
$_> perl -Ilib bin/modware-export  chado2dictycanonicalgff3 -c config/dicty_gff3.yaml \
                -o data/canonical.gff3
```

__Non-coding__
```bash
$_> perl -Ilib bin/modware-export  chado2dictynoncodinggff3 -c config/dicty_gff3.yaml \
                -o data/noncoding.gff3
```


### Non-canonical
There will be three exports one for curated,  one for sequencing center and one from
reprediction pipeline.

```bash
$_> perl -Ilib bin/modware-export chado2dictynoncanonicalgff3  \
 -c config/dicty_gff3.yaml -o data/noncanonical_seq_center.gff3 
```
```bash
$_> perl -Ilib bin/modware-export chado2dictynoncanonicalgff3  \
-c config/dicty_gff3.yaml --source 'geneID reprediction' -o data/noncanonical_repred.gff3
```
```bash
$_> perl -Ilib bin/modware-export chado2dictycuratedgff3 -c config/dicty_gff3.yaml \
     -o data/curated.gff3
```

### Alignment
EST and couple of alignments from GenBank data.

```bash
$_> perl -Ilib bin/modware-export chado2alignmentgff3 -c config/dicty_gff3.yaml \
--rt chromosome  --feature_type EST --org dicty -o data/EST.gff3
```
```bash
$_> perl -Ilib bin/modware-export chado2alignmentgff3 -c config/dicty_gff3.yaml \ 
--rt chromosome  --feature_type cDNA_clone --org dicty -o data/cDNA_clone.gff3
```
```bash
$_> perl -Ilib bin/modware-export chado2alignmentgff3 -c config/dicty_gff3.yaml \ 
--rt chromosome  --feature_type databank_entry --org dicty \
                --match_type nucleotide_match -o data/cDNA_clone.gff3
```

### Misc
Promoter features ..

```bash
$_> perl -Ilib bin/modware-export  chado2alignmentgff3 -c config/dicty_gff3.yaml \ 
    --rt chromosome --feature_type promoter --match_type promoter -o data/promoter.gff3 \ 
    --org dicty   --force_name 1 --add_description 1 --property 'details_url'
```
