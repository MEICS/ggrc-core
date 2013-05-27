from ggrc import db
from sqlalchemy import event
from .sql import SqlIndexer

class Sqlite3RecordProperty(db.Model):
  __tablename__ = 'fulltext_record_properties'

  key = db.Column(db.String, primary_key=True)
  type = db.Column(db.String)
  tags = db.Column(db.String)
  property = db.Column(db.String)
  content = db.Column(db.Text)

def create_fts_table(target, connection, **kw):
  db.session.execute(
      'DROP TABLE {tablename}'.format(tablename=target.name))
  db.session.commit()
  db.session.execute(
      'CREATE VIRTUAL TABLE {tablename} '
      'USING fts4(key, type, tags, property, content)'\
        .format(tablename=target.name))
  db.session.commit()

event.listen(
    Sqlite3RecordProperty.__table__,
    'after_create',
    create_fts_table,
    )

class Sqlite3Indexer(SqlIndexer):
  record_type = Sqlite3RecordProperty

  def search(self, terms):
    return db.session.query(self.record_type).from_statement(
        'select key, type, tags from {tablename} where content match "{terms}"'\
            .format(
                tablename=self.record_type.__tablename__,
                terms=terms,
                ))
