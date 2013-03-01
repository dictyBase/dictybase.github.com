---
layout: page
title: Loading ontology in Chado database
date: 2012-11-27 13:18
comments: true
sharing: true
footer: true
enlist: true
toc: true
---


Read the post [here](/obo-loading) to understand the ontology data model.

##Overall design
We create a [Modware-Loader](/install-modware-loader) application module which instantiate
a __Loader__ class and then call various loading specific methods on it. The __Loader__
itself consumes a database specific engine(Moose role) to run backend specific code as
needed.
The application module uses
[BioPortal](http://www.bioontology.org/wiki/index.php/BioPortal_REST_services) API download the latest version of ontology in
obo format and requires and __API KEY__ to run.

```perl

package Modware::Load::Command::bioportalobo2chado;
use strict;
use namespace::autoclean;
use Moose;
use BioPortal::WebService;
use Modware::Loader::Ontology;
use OBO::Parser::OBOParser;
extends qw/Modware::Load::Chado/;

has 'apikey' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 1,
    documentation => 'An API key for bioportal'
);

has 'ontology' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 1,
    documentation => 'Name of the ontology for loading in Chado'
);

sub execute {
  my ($self) = @_;
  my $logger = $self->logger;

  #download from bioportal
  my $bioportal = BioPortal::WebService->new( apikey => $self->apikey );
	my $downloader = $bioportal->downlaod($self->ontology);
	if (!$downloader->is_obo_format) {
		$logger->logcroak($self->ontology,  ' is not available in OBO format');
	}

	#parse obo and give it to loader
	my $loader = Modware::Loader::Ontology->new;
	my $ontology = OBO::Parser::OBOParser->new->work($downloader->filename);
	$loader->set_ontology($ontology);
	$loader->set_schema($self->schema);

}
```

Here is how the command line looks like 

```bash
$_> perl -Ilib bin/modware-load bioportalobo2chado --usage
modware-load bioportalobo2chado [-?chilpu] [long options...]
	--apikey               An API key for bioportal
	--ontology             Name of the ontology for loading in Chado
	-i --input             Name of the input file, if absent reads from
	                       STDIN
	-h -? --usage --help   Prints this usage information.
	--attr --attribute     Additional database attribute
	--pass -p --password   database password
	--dsn                  database DSN
	--schema_debug         Output SQL statements that are executed, 
	                       default to false
	-u --user              database user
	--log_level            Log level of the logger,  default is error
	-c --configfile        yaml config file to specify all command line
	                       options
	-l --logfile           Name of logfile,  default goes to STDERR
```

The __Modware::Load::Chado__ provides the *schema* and *logger* options.
{% include_code Modware::Load::Chado module lang:perl Chado.pm %}

The BioPortal client API for perl is
[here](https://github.com/dictyBase/BioPortal-WebService). 

## Backend specific engine
The loader class integrates database(storage engine) specific methods in forms of a
*Moose* role. The role is choosen dynamically based on *dsn* value provided. The backend
specific role is consumed as soon as the schema attribute is set.

```perl
package Modware::Loader::Ontology;
use namespace::autoclean;
use Moose;

has 'schema' => (
    is      => 'rw',
    isa     => 'Bio::Chado::Schema',
    writer  => 'set_schema',
    trigger => sub {
        my ( $self, $schema ) = @_;
        $self->_load_engine($schema);
        $self->_around_connection;
        $self->_check_cvprop_or_die;
    }
);

has 'connect_info' => (
    is  => 'rw',
    isa => 'Modware::Storage::Connection',
    set => 'set_connect_info'
);


sub _check_cvprop_or_die {
	my ($self) = @_;
	my $row = $self->schema->resultset('Cv::Cv')->find({name => 'cv_property'});
	croak "cv_property ontology is not loaded\n" if !$row;
	$self->set_cvrow('cv_property', $row);
}

sub _around_connection {
    my ($self)       = @_;
    my $connect_info = $self->connect_info;
    my $extra_attr   = $connect_info->extra_attribute;

    my $create_statements = $self->create_temp_statements;
    my $drop_statements   = $self->drop_temp_statements;

    push @$create_statements, $extra_attr->{on_connect_do}
        if defined $exta_attr->{on_connect_do};
    push @$drop_statements, $extra_attr->{on_disconnect_do}
        if defined $exta_attr->{on_disconnect_do};

    $self->schema->connection(
        $connect_info->dsn,
        $connect_info->user,
        $connect_info->password,
        $connect_info->attribute,
        {   on_connect_do => $create_statements,
            on_disconnect_do => $drop_statements
        }
    );
}

sub _load_engine {
    my ( $self, $schema ) = @_;
    $self->meta->make_mutable;
    my $engine = 'Modware::Loader::Role::Ontology::With'
        . ucfirst lc( $schema->storage->sqlt_type );
    ensure_all_roles( $self, $engine );
    $self->meta->make_immutable;
    $self->transform_schema;
}


```
+ The loader also validates the presence of __cv_property__(*_check_cvprop_or_die*) ontology,  it is needed to be
preloaded for any other ontology to be loaded later on. 
+ The *_around_connection* method reset the storage connection and add statements for creating and dropping staging tables.


### Methods/attributes the backend role needs to implement


####transform_schema

  Meant for altering any column name/attributes through the schema object. For example,
  for oracle backend the *synonym* column need to be renamed and the column type for all
  the chado *prop* tables need to be altered.

```perl schema transformation
package Modware::Loader::Role::Ontology::WithOracle;
use namespace::autoclean;
use Moose::Role;

sub transform_schema {
    my ($self) = @_;
    my $schema = $self->schema;
    my $source = $self->schema->source('Cv::Cvtermsynonym');
    $source->remove_column('synonym');
    $source->add_column(
        'synonym_' => {
            data_type   => 'varchar',
            is_nullable => 0,
            size        => 1024
        }
    );
    my @sources = (
        'Cv::Cvprop',     'Cv::Cvtermprop',
        'Cv::Dbxrefprop', 'Sequence::Featureprop',
        'Sequence::FeatureCvtermprop'
    );
    for my $name (@sources) {
        my $result_source = $schema->source($name);
        next if !$result_source->has_column('value');
        $result_source->remove_column('value');
        $result_source->add_column(
            'value' => {
                data_type   => 'clob',
                is_nullable => 1
            }
        );
    }
}
```
 

####create_temp_statements

It creates temporary staging tables for holding the data. It expects to return an
*ArrayRef* where each element could be a sql statement or a code reference. The create
statments should at least create the following temporary tables ....

+ temp_cvterm

```perl
package Modware::Loader::Role::Ontology::WithSqlite;

sub create_temp_statements {
    return [
        qq{
	        CREATE TEMPORARY TABLE temp_cvterm (
               name varchar(1024) NOT NULL, 
               accession varchar(1024) NOT NULL, 
               is_obsolete integer NOT NULL DEFAULT 0, 
               is_relationshiptype integer NOT NULL DEFAULT 0, 
               definition text, 
            )
   	    }
    ];
}
``` 
  
####drop_temp_statements

Similar to *create_temp_statments* but only to remove the staging tables.

```perl
package Modware::Loader::Role::Ontology::WithSqlite;

sub drop_temp_statements {
	return [ qq{ DROP TABLE temp_cvterm }];
}
```


####cache_threshold

Maximum entries that will be held in memory before it is persisted in the staging tables.

####merge_dbxrefs

####merge_cvterms

####merge_comments

__merge_relations__



### DBIC result classes for staging tables
These result classes maps to the staging temporary tables and gets registered with the
main schema.

```perl

package Modware::Loader::Schema::Temporary;

package Modware::Loader::Schema::Temporary::Cvterm';
use strict;
use base qw/DBIx::Class::Core/;

__PACKAGE__->table('temp_cvterm');
__PACKAGE__->add_columns(
    'name' => { data_type => 'varchar', size => 1024 } );
__PACKAGE__->add_columns(
    'accession' => { data_type => 'varchar', size => 1024 } );
__PACKAGE__->add_columns( 'definition' => { data_type => 'text' } );
__PACKAGE__->add_columns( 'cmmt' => { data_type => 'text' } );
__PACKAGE__->add_columns(
    'is_relationshiptype' => { data_type => 'int', default => 0 } );
__PACKAGE__->add_columns(
    'is_obsolete' => { data_type => 'int', default => 0 } );

1;

1;
```

```perl
package Modware::Loader::Ontology;
use Modware::Loader::Schema::Temporary;


has 'schema' => (
    is      => 'rw',
    isa     => 'Bio::Chado::Schema',
    writer  => 'set_schema',
    trigger => sub {
        my ($self) = @_;
        $self->_load_engine;
        $self->_around_connection;
        $self->_check_cvprop_or_die;
        $self->_register_schema_classes;
    }
);

sub _register_schema_classes {
	my ($self) = @_;
	my $schema = $self->schema;
	$schema->register_class('TempCvterm' => 'Modware::Loader::Schema::Temporary::Cvterm');
}
```




##Ontology metadata/default namespace
By default,  it will store the ontology namespace,  date and version(if available). The
loader proceeds only if there is a new version available. However,  the version value in 
__data-version__ field is non-uniform which makes it very hard to parse and compare
uniformly. So,  instead the creation date is used for comparison.

```perl
package Modware::Load::Command::bioportalobo2chado;

sub execute {
  my ($self) = @_;
  my $logger = $self->logger;

  #download from bioportal
  my $bioportal = BioPortal::WebService->new( apikey => $self->apikey );
	my $downloader = $bioportal->downlaod($self->ontology);
	if (!$downloader->is_obo_format) {
		$logger->logcroak($self->ontology,  ' is not available in OBO format');
	}

	#parse obo and give it to loader
	my $loader = Modware::Loader::Ontology->new;
	my $ontology = OBO::Parser::OBOParser->new->work($downloader->filename);
	$loader->set_ontology($ontology);
	$loader->set_schema($self->schema);

  # check if it is a new version
  if ($loader->is_ontology_in_db()) {
    if (!$loader->is_ontology_new_version() ) {
	    $logger->logcroak("This version of ontology already exist in database");
    }
  }
  $loader->store_metadata;
}
```

Check line __34__ for date comparsion using __DateTime__ object.

```perl
package Modware::Loader::Ontology;
use DateTime::Format::Strptime;

has '_date_parser' => (
	is => 'ro', 
	isa => 'DateTime::Format::Strptime', 
	lazy => 1, 
	default => sub{
		return DateTime::Format::Strptime->new(
			pattern => '%Y-%m-%d', 
			on_error => 'croak'
		);
	}
);

sub is_ontology_in_db {
    my ($self) = @_;
    my $row = $self->schema->resultset('Cv::Cv')
        ->find( { name => $self->ontology->default_namespace } );
    if ($row) {
        $self->set_cvrow( $self->ontology->default_namespace, $row );
        return $row;
    }
}


sub is_ontology_new_version {
    my ($self) = @_;
    my $onto_datetime
        = $self->_date_parser->parse_datetime( $self->ontology->date );
    my $db_datetime = $self->_date_parser->parse_datetime(
        $self->_get_ontology_date_from_db );

    if ( $onto_datetime > $db_datetime ) {
        return $onto_datetime;
    }
}

sub _get_ontology_date_from_db {
    my ($self) = @_;
    my $cvrow;
    my $cvname = $self->ontology->default_namespace;
    if ( $self->exists_cvrow($cvname) ) {
        $cvrow = $self->get_cvrow($cvname);
    }
    else {
        $cvrow
            = $self->schema->resultset('Cv::Cv')->find( { name => $cvname } );
        $self->set_cvrow( $cvname, $cvrow );
    }
    my $version_row = $cvrow->search_related(
        'cvprops',
        {   'cv.name'   => 'cv_property',
            'type.name' => 'date'
        },
        { join => [ { 'type' => 'cv' } ], rows => 1 }
    )->single;
    return $version_row->value if $version_row;
}
```

It stores four data attributes(metadata) *data-version*, *date*, *saved-by*, *remark* of
the ontology.

```perl
package Modware::Loader::Ontology;
sub store_metadata {
    my ($self) = @_;
    my $schema = $self->schema;
    my $onto   = $self->ontology;

    my $cvrow = $schema->resultset('Cv::Cv')
        ->find_or_new( { name => $onto->name } );
    if ( $cvrow->in_storage ) {
        my $rs = $cvrow->search_related(
            'cvprops',
            { 'cv.name' => 'cv_property' },
            { join      => [ { 'type' => 'cv' } ] }
        );
        for my $row ( $rs->all ) {
            ( my $method = $row->type->name ) =~ s{-}{_};
            $row->value( $onto->$method );
            $row->update;
        }
    }
    else {
        my $data_array;
        $cvrow->insert;
        my $cvprop_id = $self->get_cvrow('cv_property')->cv_id;
        for my $method ( ( 'date', 'data_version', 'saved_by', 'remark' ) ) {
            ( my $cvterm = $method ) =~ s{_}{-};
            push @$data_array,
                {
                value   => $onto->$method,
                type_id => $schema->resultset('Cv::Cvterm')->find(
                    {   name  => $cvterm,
                        cv_id => $cvprop_id
                    }
                )->cvterm_id
                };
        }
        $cvrow->create_related( 'cvprops', $data_array );
        $self->set_cvrow($cvrow->name, $cvrow);
    }
}

with 'Modware::Loader::Role::Ontology::WithHelper';
```

```perl
package Modware::Loader::Role::Ontology::WithHelper;
use namespace::autoclean;
use Moose::Role;


requires 'schema';

has '_cvrow' => (
    is      => 'rw',
    isa     => 'HashRef',
    traits  => ['Hash'],
    default => sub { {} },
    handles => {
        get_cvrow   => 'get',
        set_cvrow   => 'set',
        exist_cvrow => 'defined'
    }
);

```



##Create namespaces
Here,  more or less some of the namespaces will be shared and might have been created
during other ontology loading,  so this step will go on with *find_or_create* mode. 

```perl
package Modware::Load::Command::bioportalobo2chado;
sub execute { 
  ($self) = @_;
   ...........
  $self->find_or_create_namespaces;
}
```

Its going to create(or find) for various components and in each step cache them for later
use. 

```perl
package Modware::Loader::Ontology;

sub find_or_create_namespaces {
    my ($self) = @_;
    $self->find_or_create_dbrow('internal');
    $self->find_or_create_cvrow($_) for qw/cvterm_property_type synonym_type/;
    $self->find_or_create_cvterm_namespace($_)
        for
        qw/comment alt_id xref cyclic reflexive transitive anonymous domain range/;
    $self->find_or_create_cvterm_namespace( $_, 'synonym_type' )
        for qw/EXACT BROAD NARROW RELATED/;

}
```


The __Helper__ role gets *dbrow* and *cvterm_row* attributes for caching and
bunch of helper methods.

```perl
package Modware::Loader::Role::Ontology::WithHelper;

has '_cvterm_row' => (
    is        => 'rw',
    isa       => 'HashRef',
    traits    => ['Hash'],
    predicate => 'has_cvterm_row',
    default   => sub { {} },
    handles   => {
        get_cvterm_row   => 'get',
        set_cvterm_row   => 'set',
        exist_cvterm_row => 'defined'
    }
);


has '_dbrow' => (
    is      => 'rw',
    isa     => 'HashRef',
    traits  => [qw/Hash/],
    default => sub { {} },
    handles => {
        add_dbrow    => 'set',
        get_dbrow    => 'get',
        delete_dbrow => 'delete',
        has_dbrow    => 'defined'
    }
);

sub find_or_create_dbrow {
    my ( $self, $db ) = @_;
    my $schema = $self->schema;
    my $dbrow  = $schema->resultset('General::Db')
        ->find_or_create( { name => $db } );
    $self->set_dbrow( $db, $dbrow ) if !$self->has_dbrow($db);
    return $dbrow;
}

sub find_or_create_cvrow {
    my ( $self, $cv ) = @_;
    my $schema = $self->schema;
    my $cvrow
        = $schema->resultset('Cv::Cv')->find_or_create( { name => $cv } );
    $self->set_cvrow( $cv, $cvrow )
        if !$self->has_cvrow($cv);
    return $cvrow;
}

sub find_or_create_cvterm_namespace {
    my ($self, $cvterm, $cv, $db) = @_;
    $cv  ||= 'cvterm_property_type';
    $db  ||= 'internal';
    my $schema = $self->schema;

    my $cvterm_row
        = $schema->resultset('Cv::Cvterm')->find( { name => $cvterm } );
    if ($cvterm_row) {
        $self->set_cvterm_row( $cvterm, $cvterm_row )
            if !$self->has_cvterm_row($cvterm);
    }
    else {
        my $dbxref_row
            = $schema->resultset('General::Dbxref')->find_or_create(
            {   accession => $cvterm, 
                db_id     => $self->get_dbrow($db)->db_id
            }
            );
        $cvterm_row = $schema->resultset('Cv::Cvterm')->create(
            {   name      => $cvterm, 
                cv_id     => $self->get_cvrow($cv)->cv_id,
                dbxref_id => $dbxref_row->dbxref_id
            }
        );
        $self->set_cvterm_row($cvterm, $cvterm_row);
    }
    return $cvterm_row;
}

```

##Load data in staging temporary tables
Overall,  the loader prepares *perl data hashes* suitable for insertion and loads them in
various staging temp tables. The entire process is wrapped around *prepare_data_for
loading* method.

```perl
package Modware::Loader::Ontology;

sub prepare_data_for_loading {
    my ($self) = @_;
    my $onto   = $self->ontology;
    my $cv_id  = $self->get_cvrow( $onto->default_namespace )->cv_id;
    my $insert_array;
    for my $term ( @{ $onto->get_relationship_types, $onto->get_terms } ) {
        my $insert_hash = $self->_get_insert_term_hash($term);
        $insert_hash->{cv_id} = $cv_id;
        push @$insert_array, $insert_hash;
    }
    my $schema = $self->schema;
    $schema->resultset('TempCvterm')->populate($insert_array);
}

sub cvterms_in_staging {
    my ($self) = @_;
    return $self->schema->resultset('TempCvterm')->count( {} );
}

sub _get_insert_term_hash {
    my ( $self, $term ) = @_;
    my ( $db_id, $accession );
    if ( $self->has_idspace( $term->id ) ) {
        my @parsed = $self->parse_id( $term->id );
        $db_id     = $self->find_or_create_db_id( $parsed[0] );
        $accession = $parsed[1];
    }
    else {
        $db_id     = $self->find_or_create_db_id( $self->cv_namespace->name );
        $accession = $term->id;
    }

    my $insert_hash;
    $insert_hash->{accession}  = $accession;
    $insert_hash->{db_id}      = $db_id;
    $insert_hash->{definition} = encode( "UTF-8", $term->def->text )
        if $term->def;
    $insert_hash->{is_relationshiptype} = 1
        if $term->isa('OBO::Core::RelationshipType');
    $insert_hash->{is_obsolete} = 1 if $term->is_obsolete;
    $insert_hash->{name} = $term->name ? $term->name : $term->id;
    $insert_hash->{comment} = $term->comment;
    return $insert_hash;
}
```

The __Helper__ module also gets few methods to reuse

```perl
package Modware::Loader::Role::Ontology::WithHelper;

sub has_idspace {
    my ( $self, $id ) = @_;
    return 1 if $id =~ /:/;
}

sub parse_id {
    my ( $self, $id ) = @_;
    return split /:/, $id;
}

sub find_or_create_db_id {
    my ( $self, $name ) = @_;
    if ( $self->has_dbrow($name) ) {
        return $self->get_dbrow($name)->db_id;
    }
    my $schema = $self->schema;
    my $row    = $schema->resultset('General::Db')
        ->find_or_create( { name => $name } );
    $self->set_dbrow( $name, $row );
    $row->db_id;
}
```

And finally you call it from main application and load them in a separte transaction
```perl
package Modware::Load::Command::bioportalobo2chado;

sub execute {
....
    #transaction for loading in staging temp tables
    $guard  = $self->schema->txn_scope_guard;
    $loader->prepare_data_for_loading;
    $guard->commit;

    $logger->info(loader->cvterms_in_staging,  " terms in temp table");
}
```

